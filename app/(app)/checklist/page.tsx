"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  Filter,
  FolderCheck,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  User as UserIcon,
  Users,
  X,
  Zap,
  Bell,
  EyeOff,
  Eye,
  ArrowUpRight,
  MessageSquare,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  empresas?: string[] | null;
}

type RecurrenceType = "daily" | "weekdays" | "weekends" | "monthly" | "custom";

interface Template {
  id: string;
  title: string;
  description: string | null;
  category: string;
  empresa: string | null;
  setor?: string | null;
  assigned_to: string | null;
  created_by?: string | null;
  recurrence_type: RecurrenceType;
  recurrence_day: number | null;
  custom_days: number[] | null;
  requires_input: boolean;
  input_label: string | null;
  requires_photo: boolean;
  is_one_time: boolean;
  created_at?: string;
}

interface Log {
  id: string;
  template_id: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  date: string;
  input_value?: string | null;
  photo_url?: string | null;
}

interface SubtaskComment {
  id: string;
  subtask_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

interface Subtask {
  id: string;
  checklist_item_id: string;
  title: string;
  completed: boolean;
  assigned_to?: string | null;
  comments?: SubtaskComment[];
}

interface FormSubtask {
  title: string;
  assigned_to: string | null;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const DAYS_OF_WEEK = [
  { label: "Dom", value: 0 },
  { label: "Seg", value: 1 },
  { label: "Ter", value: 2 },
  { label: "Qua", value: 3 },
  { label: "Qui", value: 4 },
  { label: "Sex", value: 5 },
  { label: "Sáb", value: 6 },
];

const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  daily: "Todos os dias",
  weekdays: "Dias úteis (seg–sex)",
  weekends: "Fins de semana",
  monthly: "Mensal",
  custom: "Dias específicos",
};

const CATEGORIES = ["Geral", "Abertura", "Fechamento", "Limpeza", "Estoque", "Financeiro", "Atendimento", "Urgente"];

const EMPRESAS = [
  "Todas / Grupo B&A",
  "Serra Carioca",
  "Feitoria Cozinha",
  "Casa Cônego",
  "Savá Padaria",
  "Rua Burguer",
  "Feito Brasa",
  "Produção Central",
  "Distribuidora",
];

const SETORES = [
  "Geral / Todos",
  "Gestão & ADM",
  "Marketing & Comunicação",
  "Financeiro & Controladoria",
  "Operacional / Salão",
  "Cozinha & Produção",
  "Compras & Suprimentos",
];

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toLocalDateString(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isDueOn(t: Template, dateStr: string) {
  const date = parseLocalDate(dateStr);
  const dow = date.getDay();
  switch (t.recurrence_type) {
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "weekends":
      return dow === 0 || dow === 6;
    case "monthly": {
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const target = Math.min(t.recurrence_day ?? 1, lastDay);
      return date.getDate() === target;
    }
    case "custom":
      return (t.custom_days ?? []).includes(dow);
    default:
      return true;
  }
}

function recurrenceText(t: Template) {
  if (t.is_one_time) return "Tarefa extra (única)";
  if (t.recurrence_type === "monthly") return `Mensal — dia ${t.recurrence_day ?? 1}`;
  if (t.recurrence_type === "custom") {
    const days = DAYS_OF_WEEK.filter((d) => (t.custom_days ?? []).includes(d.value)).map((d) => d.label);
    return days.length ? days.join(", ") : "Nenhum dia selecionado";
  }
  return RECURRENCE_LABEL[t.recurrence_type] ?? "Todos os dias";
}

export default function ChecklistPage() {
  const [supabase] = useState(() => createClient());
  const [activeTab, setActiveTab] = useState<"daily" | "reports" | "manage">("daily");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<Record<string, Log>>({});
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  const [newSubtaskTexts, setNewSubtaskTexts] = useState<Record<string, string>>({});
  const [newSubtaskAssignedTo, setNewSubtaskAssignedTo] = useState<Record<string, string>>({});
  
  const [expandedSubtaskComments, setExpandedSubtaskComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const [oneTimeDoneBefore, setOneTimeDoneBefore] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  
  const [startDate, setStartDate] = useState(todayLocal());
  const [endDate, setEndDate] = useState(todayLocal());
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterEmpresa, setFilterEmpresa] = useState<string>("all");
  const [filterSetor, setFilterSetor] = useState<string>("all");
  
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [completingTemplate, setCompletingTemplate] = useState<Template | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [showOneTimeModal, setShowOneTimeModal] = useState(false);
  const [oneTimeTitle, setOneTimeTitle] = useState("");
  const [oneTimeDesc, setOneTimeDesc] = useState("");
  const [oneTimeCategory, setOneTimeCategory] = useState("Geral");
  const [oneTimeAssignedTo, setOneTimeAssignedTo] = useState("");
  const [oneTimeEmpresa, setOneTimeEmpresa] = useState("");
  const [oneTimeSetor, setOneTimeSetor] = useState("Geral / Todos");
  const [oneTimeFormSubtasks, setOneTimeFormSubtasks] = useState<FormSubtask[]>([]);
  const [oneTimeSubInput, setOneTimeSubInput] = useState("");
  const [oneTimeSubAssignedTo, setOneTimeSubAssignedTo] = useState("");

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Geral");
  const [newEmpresa, setNewEmpresa] = useState<string>("Todas / Grupo B&A");
  const [newSetor, setNewSetor] = useState<string>("Geral / Todos");
  const [newAssignedTo, setNewAssignedTo] = useState<string>("");
  const [newRecurrenceType, setNewRecurrenceType] = useState<RecurrenceType>("daily");
  const [newRecurrenceDay, setNewRecurrenceDay] = useState<number>(1);
  const [newCustomDays, setNewCustomDays] = useState<number[]>([]);
  const [newRequiresInput, setNewRequiresInput] = useState(false);
  const [newInputLabel, setNewInputLabel] = useState("");
  const [newRequiresPhoto, setNewRequiresPhoto] = useState(false);
  
  const [formSubtasks, setFormSubtasks] = useState<FormSubtask[]>([]);
  const [formSubtaskInput, setFormSubtaskInput] = useState("");
  const [formSubtaskAssignedTo, setFormSubtaskAssignedTo] = useState("");

  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);

  const isColaborador = (currentUserProfile?.role ?? "member") === "member";

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  async function fetchInitialData() {
    setLoading(true);

    let profileData: Profile | null = null;
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      setCurrentUser(userData.user.id);
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, empresas")
        .eq("id", userData.user.id)
        .single();

      if (myProfile) {
        profileData = myProfile;
        setCurrentUserProfile(myProfile);
        setFilterUser(myProfile.id);
        
        if (myProfile.role === "member") {
          if (myProfile.empresas && myProfile.empresas.length === 1) {
             setFilterEmpresa(myProfile.empresas[0]);
          }
        }
      }
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, empresas")
      .order("full_name", { ascending: true });

    if (profilesData) setUsers(profilesData);

    let query = supabase.from("daily_checklist_templates").select("*").order("created_at", { ascending: true });
    
    if (profileData?.role === "member" && profileData.empresas?.length) {
      query = query.in("empresa", profileData.empresas);
    }

    const { data: tmpls, error } = await query;

    if (error) toast.error("Erro ao carregar rotinas", { description: error.message });
    if (tmpls) {
      setTemplates(tmpls);
      fetchSubtasks(tmpls.map((t: Template) => t.id));
    }

    await fetchLogs();
    setLoading(false);
  }

  async function fetchNotifications() {
    if (!currentUser) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", currentUser)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
    }
  }

  async function markNotificationAsRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function fetchSubtasks(templateIds: string[]) {
    if (!templateIds.length) return;
    const { data, error } = await supabase
      .from("checklist_subtasks")
      .select("*")
      .in("checklist_item_id", templateIds);

    if (!error && data) {
      const subtaskIds = data.map((s: Subtask) => s.id);
      
      let commentsMap: Record<string, SubtaskComment[]> = {};
      if (subtaskIds.length > 0) {
        const { data: commentsData } = await supabase
          .from("checklist_subtask_comments")
          .select("*")
          .in("subtask_id", subtaskIds)
          .order("created_at", { ascending: true });
          
        if (commentsData) {
          commentsData.forEach((c: SubtaskComment) => {
            if (!commentsMap[c.subtask_id]) commentsMap[c.subtask_id] = [];
            commentsMap[c.subtask_id].push(c);
          });
        }
      }

      const map: Record<string, Subtask[]> = {};
      data.forEach((s: Subtask) => {
        if (!map[s.checklist_item_id]) map[s.checklist_item_id] = [];
        map[s.checklist_item_id].push({
          ...s,
          comments: commentsMap[s.id] || []
        });
      });
      setSubtasks(map);
    }
  }

  async function fetchLogs() {
    const { data: lgData, error } = await supabase
      .from("daily_checklist_logs")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar registros", { description: error.message });
      return;
    }

    if (lgData) {
      const logMap: Record<string, Log> = {};
      const doneBefore = new Set<string>();
      lgData.forEach((l: Log) => {
        logMap[l.template_id] = l;
        if (l.completed && l.date < startDate) doneBefore.add(l.template_id);
      });
      setLogs(logMap);
      setOneTimeDoneBefore(doneBefore);
    }
  }

  async function handleToggleSubtask(subtask: Subtask) {
    const updatedStatus = !subtask.completed;
    const { data, error } = await supabase
      .from("checklist_subtasks")
      .update({ completed: updatedStatus })
      .eq("id", subtask.id)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao atualizar subtarefa");
      return;
    }

    if (data) {
      setSubtasks((prev) => ({
        ...prev,
        [subtask.checklist_item_id]: (prev[subtask.checklist_item_id] || []).map((s) =>
          s.id === subtask.id ? { ...data, comments: s.comments } : s
        ),
      }));
    }
  }

  async function handleAddComment(subtask: Subtask, e: React.FormEvent) {
    e.preventDefault();
    const text = commentInputs[subtask.id]?.trim();
    if (!text || !currentUser) return;

    const { data, error } = await supabase
      .from("checklist_subtask_comments")
      .insert({
        subtask_id: subtask.id,
        user_id: currentUser,
        comment: text,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao enviar comentário");
      return;
    }

    if (data) {
      setSubtasks((prev) => ({
        ...prev,
        [subtask.checklist_item_id]: (prev[subtask.checklist_item_id] || []).map((s) =>
          s.id === subtask.id ? { ...s, comments: [...(s.comments || []), data] } : s
        ),
      }));
      setCommentInputs((prev) => ({ ...prev, [subtask.id]: "" }));

      if (subtask.assigned_to && subtask.assigned_to !== currentUser) {
        const senderName = currentUserProfile?.full_name || "Alguém";
        await supabase.from("notifications").insert({
          user_id: subtask.assigned_to,
          title: "Novo comentário em aprovação",
          message: `${senderName} comentou na subtarefa: "${subtask.title}"`,
        });
        fetchNotifications();
      }

      toast.success("Comentário adicionado!");
    }
  }

  async function handleAddSubtask(templateId: string, e: React.FormEvent) {
    e.preventDefault();
    const text = newSubtaskTexts[templateId]?.trim();
    if (!text) return;

    const assigned = newSubtaskAssignedTo[templateId] || null;

    const { data, error } = await supabase
      .from("checklist_subtasks")
      .insert({ 
        checklist_item_id: templateId, 
        title: text, 
        completed: false,
        assigned_to: assigned
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao adicionar subtarefa");
      return;
    }

    if (data) {
      setSubtasks((prev) => ({
        ...prev,
        [templateId]: [...(prev[templateId] || []), { ...data, comments: [] }],
      }));
      setNewSubtaskTexts((prev) => ({ ...prev, [templateId]: "" }));
      setNewSubtaskAssignedTo((prev) => ({ ...prev, [templateId]: "" }));

      if (assigned) {
        const senderName = currentUserProfile?.full_name || "Alguém";
        await supabase.from("notifications").insert({
          user_id: assigned,
          title: "Nova pergunta / aprovação",
          message: `${senderName} marcou-o na subtarefa: "${text}"`,
        });
        fetchNotifications();
      }

      toast.success("Subtarefa adicionada e notificação enviada!");
    }
  }

  async function handleDeleteSubtask(subtask: Subtask) {
    const { error } = await supabase.from("checklist_subtasks").delete().eq("id", subtask.id);
    if (error) return void toast.error("Erro ao remover subtarefa");
    
    setSubtasks((prev) => ({
      ...prev,
      [subtask.checklist_item_id]: (prev[subtask.checklist_item_id] || []).filter((s) => s.id !== subtask.id),
    }));
  }

  async function handleCheckClick(template: Template) {
    const currentLog = logs[template.id];
    const isCompleted = !!currentLog?.completed;

    if (isCompleted) {
      setTogglingId(template.id);
      const { data, error } = await supabase
        .from("daily_checklist_logs")
        .update({
          completed: false,
          completed_at: null,
          completed_by: currentUser,
        })
        .eq("id", currentLog.id)
        .select()
        .single();
      setTogglingId(null);

      if (error) return void toast.error("Não foi possível desmarcar", { description: error.message });
      if (data) setLogs((prev) => ({ ...prev, [template.id]: data }));
    } else {
      if (template.requires_input || template.requires_photo) {
        setCompletingTemplate(template);
        setInputValue("");
        setPhotoFile(null);
      } else {
        setTogglingId(template.id);
        await submitCompletion(template.id, template.assigned_to, null, null);
        setTogglingId(null);
      }
    }
  }

  async function submitCompletion(
    templateId: string,
    assignedTo: string | null,
    val: string | null,
    photoUrl: string | null,
  ) {
    setUploading(true);
    const currentLog = logs[templateId];
    const targetDate = startDate;

    const result =
      currentLog
        ? await supabase
            .from("daily_checklist_logs")
            .update({
              completed: true,
              completed_at: new Date().toISOString(),
              completed_by: currentUser,
              input_value: val,
              photo_url: photoUrl || currentLog.photo_url,
            })
            .eq("id", currentLog.id)
            .select()
            .single()
        : await supabase
            .from("daily_checklist_logs")
            .insert({
              template_id: templateId,
              completed: true,
              completed_at: new Date().toISOString(),
              completed_by: currentUser,
              assigned_to: assignedTo,
              date: targetDate,
              input_value: val,
              photo_url: photoUrl,
            })
            .select()
            .single();

    setUploading(false);

    if (result.error) {
      toast.error("Não foi possível concluir", { description: result.error.message });
      return;
    }
    if (result.data) setLogs((prev) => ({ ...prev, [templateId]: result.data }));
    setCompletingTemplate(null);
  }

  async function handleConfirmModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!completingTemplate) return;

    if (completingTemplate.requires_input && !inputValue.trim()) {
      return void toast.error(`Preencha: ${completingTemplate.input_label || "valor"}`);
    }
    if (completingTemplate.requires_photo && !photoFile) {
      return void toast.error("Anexe a foto para concluir.");
    }

    let photoUrl: string | null = null;

    if (photoFile) {
      setUploading(true);
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${completingTemplate.id}_${Date.now()}.${fileExt}`;
      const filePath = `checklist/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("checklist-photos").upload(filePath, photoFile);

      if (uploadError) {
        setUploading(false);
        return void toast.error("Falha no envio da foto", { description: uploadError.message });
      }
      const { data: publicUrlData } = supabase.storage.from("checklist-photos").getPublicUrl(filePath);
      photoUrl = publicUrlData.publicUrl;
    }

    await submitCompletion(completingTemplate.id, completingTemplate.assigned_to, inputValue || null, photoUrl);
  }

  async function handleCreateOneTimeTask(e: React.FormEvent) {
    e.preventDefault();
    if (!oneTimeTitle.trim()) return;

    const targetUser = isColaborador ? currentUser : oneTimeAssignedTo || null;

    const { data, error } = await supabase
      .from("daily_checklist_templates")
      .insert({
        title: oneTimeTitle,
        description: oneTimeDesc,
        category: oneTimeCategory,
        empresa: oneTimeEmpresa || "Todas / Grupo B&A",
        setor: oneTimeSetor || "Geral / Todos",
        assigned_to: targetUser,
        created_by: currentUser,
        recurrence_type: "daily",
        is_one_time: true,
      })
      .select()
      .single();

    if (error) return void toast.error("Não foi possível criar a tarefa", { description: error.message });
    if (data) {
      if (oneTimeFormSubtasks.length > 0) {
        const subtaskInserts = oneTimeFormSubtasks.map((st) => ({
          checklist_item_id: data.id,
          title: st.title,
          assigned_to: st.assigned_to,
          completed: false,
        }));
        const { data: insertedSubs } = await supabase.from("checklist_subtasks").insert(subtaskInserts).select();
        if (insertedSubs) {
          for (const sub of insertedSubs) {
            if (sub.assigned_to) {
              const senderName = currentUserProfile?.full_name || "Alguém";
              await supabase.from("notifications").insert({
                user_id: sub.assigned_to,
                title: "Nova pergunta / aprovação",
                message: `${senderName} marcou-o na subtarefa: "${sub.title}"`,
              });
            }
          }
        }
        fetchSubtasks([data.id]);
      }

      setTemplates((prev) => [...prev, data]);
      setOneTimeTitle("");
      setOneTimeDesc("");
      setOneTimeCategory("Geral");
      setOneTimeAssignedTo("");
      setOneTimeFormSubtasks([]);
      setShowOneTimeModal(false);
      toast.success("Tarefa extra criada com sucesso.");
    }
  }

  function handleToggleCustomDay(dayVal: number) {
    setNewCustomDays((prev) => (prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal]));
  }

  async function handleStartEdit(template: Template) {
    setEditingTemplateId(template.id);
    setNewTitle(template.title);
    setNewDesc(template.description || "");
    setNewCategory(template.category || "Geral");
    setNewEmpresa(template.empresa || "Todas / Grupo B&A");
    setNewSetor(template.setor || "Geral / Todos");
    setNewAssignedTo(template.assigned_to || "");
    setNewRecurrenceType(template.recurrence_type || "daily");
    setNewRecurrenceDay(template.recurrence_day || 1);
    setNewCustomDays(template.custom_days || []);
    setNewRequiresInput(template.requires_input || false);
    setNewInputLabel(template.input_label || "");
    setNewRequiresPhoto(template.requires_photo || false);
    
    const currentSubs = subtasks[template.id] || [];
    setFormSubtasks(currentSubs.map((s) => ({ title: s.title, assigned_to: s.assigned_to || null })));
    setFormSubtaskInput("");
    setFormSubtaskAssignedTo("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingTemplateId(null);
    setNewTitle("");
    setNewDesc("");
    setNewCategory("Geral");
    setNewEmpresa("Todas / Grupo B&A");
    setNewSetor("Geral / Todos");
    setNewAssignedTo("");
    setNewRecurrenceType("daily");
    setNewRecurrenceDay(1);
    setNewCustomDays([]);
    setNewRequiresInput(false);
    setNewInputLabel("");
    setNewRequiresPhoto(false);
    setFormSubtasks([]);
    setFormSubtaskInput("");
    setFormSubtaskAssignedTo("");
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (newRecurrenceType === "custom" && newCustomDays.length === 0) {
      return void toast.error("Selecione ao menos um dia da semana.");
    }

    const payload = {
      title: newTitle,
      description: newDesc,
      category: newCategory,
      empresa: newEmpresa || "Todas / Grupo B&A",
      setor: newSetor || "Geral / Todos",
      assigned_to: newAssignedTo || null,
      recurrence_type: newRecurrenceType,
      recurrence_day: newRecurrenceType === "monthly" ? newRecurrenceDay : null,
      custom_days: newRecurrenceType === "custom" ? [...newCustomDays].sort() : null,
      requires_input: newRequiresInput,
      input_label: newRequiresInput ? newInputLabel || null : null,
      requires_photo: newRequiresPhoto,
    };

    setSavingTemplate(true);
    const result = editingTemplateId
      ? await supabase.from("daily_checklist_templates").update(payload).eq("id", editingTemplateId).select().single()
      : await supabase
          .from("daily_checklist_templates")
          .insert({ ...payload, created_by: currentUser, is_one_time: false })
          .select()
          .single();

    if (result.error) {
      setSavingTemplate(false);
      return void toast.error("Não foi possível salvar", { description: result.error.message });
    }

    const saved = result.data as Template;

    if (formSubtasks.length > 0) {
      const subtaskInserts = formSubtasks.map((st) => ({
        checklist_item_id: saved.id,
        title: st.title,
        assigned_to: st.assigned_to,
        completed: false,
      }));
      await supabase.from("checklist_subtasks").insert(subtaskInserts);
    }

    setSavingTemplate(false);
    setTemplates((prev) =>
      editingTemplateId ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved],
    );
    toast.success(editingTemplateId ? "Rotina atualizada." : "Rotina criada.");
    handleCancelEdit();
    fetchSubtasks([saved.id]);
  }

  async function handleDeleteTemplate() {
    if (!deletingTemplate) return;
    const { error } = await supabase.from("daily_checklist_templates").delete().eq("id", deletingTemplate.id);
    if (error) return void toast.error("Não foi possível excluir", { description: error.message });
    setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id));
    if (editingTemplateId === deletingTemplate.id) handleCancelEdit();
    toast.success("Rotina excluída.");
  }

  const userName = (id: string | null) => {
    if (!id) return "Todos / Equipe";
    const u = users.find((x) => x.id === id);
    return u?.full_name || u?.email || "—";
  };

  const dueInRange = useMemo(() => {
    return templates.filter((t) => {
      if (t.created_at && toLocalDateString(t.created_at) > endDate) return false;
      if (t.is_one_time) return !oneTimeDoneBefore.has(t.id);
      
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      let curr = new Date(start);
      while (curr <= end) {
        const currStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(curr.getDate()).padStart(2, "0")}`;
        if (isDueOn(t, currStr)) return true;
        curr.setDate(curr.getDate() + 1);
      }
      return false;
    });
  }, [templates, startDate, endDate, oneTimeDoneBefore]);

  const isDone = (t: Template) => {
    const l = logs[t.id];
    return !!l && l.completed;
  };

  const visibleTasks = useMemo(() => {
    return dueInRange.filter((t) => {
      const itemSubs = subtasks[t.id] || [];
      const hasSubtaskAssignedToUser = filterUser !== "all" && itemSubs.some(s => s.assigned_to === filterUser);

      const matchesUser = filterUser === "all" || t.assigned_to === filterUser || !t.assigned_to || hasSubtaskAssignedToUser;
      const matchesEmpresa = filterEmpresa === "all" || t.empresa === filterEmpresa || t.empresa === "Todas / Grupo B&A";
      const matchesSetor = filterSetor === "all" || t.setor === filterSetor || t.setor === "Geral / Todos";

      let hasAccessToEmpresa = true;
      if (isColaborador && currentUserProfile?.empresas && currentUserProfile.empresas.length > 0) {
        hasAccessToEmpresa = t.empresa ? currentUserProfile.empresas.includes(t.empresa) || t.empresa === "Todas / Grupo B&A" : true;
      }

      const matchesCompletion = !hideCompleted || !isDone(t);

      return matchesUser && matchesEmpresa && matchesSetor && hasAccessToEmpresa && matchesCompletion;
    });
  }, [dueInRange, filterUser, filterEmpresa, filterSetor, isColaborador, currentUserProfile, subtasks, hideCompleted, logs]);

  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    visibleTasks.forEach((t) => {
      const key = t.is_one_time ? "⚡ Tarefas extras" : t.category || "Geral";
      map.set(key, [...(map.get(key) ?? []), t]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => (a.startsWith("⚡") ? -1 : b.startsWith("⚡") ? 1 : a.localeCompare(b)));
  }, [visibleTasks]);

  const doneCount = dueInRange.filter(isDone).length;
  const totalCount = dueInRange.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const report = useMemo(() => {
    const rows = new Map<string, { id: string | null; total: number; done: number; pending: Template[] }>();
    visibleTasks.forEach((t) => {
      const key = t.assigned_to ?? "__team";
      const row = rows.get(key) ?? { id: t.assigned_to, total: 0, done: 0, pending: [] };
      row.total += 1;
      if (isDone(t)) row.done += 1;
      else row.pending.push(t);
      rows.set(key, row);
    });
    return Array.from(rows.values()).sort((a, b) => b.total - a.total);
  }, [visibleTasks, logs]);

  const manageList = useMemo(() => {
    let filtered = templates.filter((t) => !t.is_one_time);
    if (filterEmpresa !== "all") {
       filtered = filtered.filter(t => t.empresa === filterEmpresa || t.empresa === "Todas / Grupo B&A");
    }
    if (filterSetor !== "all") {
       filtered = filtered.filter(t => t.setor === filterSetor || t.setor === "Geral / Todos");
    }
    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  }, [templates, filterEmpresa, filterSetor]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "daily" as const, label: "Checklist do Período", icon: CheckSquare },
    ...(!isColaborador
      ? [
          { id: "reports" as const, label: "Acompanhamento", icon: Users },
          { id: "manage" as const, label: "Gerenciar Rotinas", icon: Repeat },
        ]
      : []),
  ];

  const isTodaySelected = startDate === todayLocal() && endDate === todayLocal();
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Checklist Diário</h1>
          <p className="mt-1 text-sm text-slate-500">Rotinas operacionais, subtarefas e tarefas extras por empresa e setor.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Botão de Ocultar/Mostrar Finalizadas */}
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              hideCompleted ? "bg-primary text-white border-primary" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
            title={hideCompleted ? "Exibir concluídas" : "Ocultar concluídas"}
          >
            {hideCompleted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{hideCompleted ? "Ocultando concluídas" : "Mostrar concluídas"}</span>
          </button>

          {/* Sino de Notificações */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex items-center justify-center rounded-lg border bg-white p-2.5 text-slate-600 hover:bg-slate-50"
              title="Notificações"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-white p-3 shadow-xl z-50">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <span className="font-semibold text-sm text-slate-800">Notificações</span>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">Nenhuma notificação</p>
                ) : (
                  <ul className="max-h-60 overflow-y-auto space-y-2">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        onClick={() => markNotificationAsRead(n.id)}
                        className={`cursor-pointer rounded-lg p-2.5 text-xs transition-colors ${
                          n.read ? "bg-slate-50 text-slate-600" : "bg-primary/10 text-slate-900 font-medium"
                        }`}
                      >
                        <p className="font-semibold">{n.title}</p>
                        <p className="mt-0.5">{n.message}</p>
                        <span className="mt-1 block text-[10px] text-slate-400">
                          {new Date(n.created_at).toLocaleString("pt-BR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Filtro por Empresa */}
          <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
            <Building2 className="h-4 w-4 text-slate-500" />
            <select 
              value={filterEmpresa} 
              onChange={(e) => setFilterEmpresa(e.target.value)} 
              className="bg-transparent outline-none max-w-[130px] truncate"
            >
              <option value="all">Todas Empresas</option>
              {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>

          {/* Filtro por Setor */}
          <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
            <Briefcase className="h-4 w-4 text-slate-500" />
            <select 
              value={filterSetor} 
              onChange={(e) => setFilterSetor(e.target.value)} 
              className="bg-transparent outline-none max-w-[130px] truncate"
            >
              <option value="all">Todos Setores</option>
              {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          {/* Intervalo de Datas */}
          <div className="flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-sm">
            <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => e.target.value && setStartDate(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-xs"
              title="Data Inicial"
            />
            <span className="text-slate-400">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => e.target.value && setEndDate(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-xs"
              title="Data Final"
            />
            <button
              type="button"
              onClick={() => {
                const t = todayLocal();
                setStartDate(t);
                setEndDate(t);
              }}
              className={`ml-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                isTodaySelected 
                  ? "bg-primary text-white" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Hoje
            </button>
          </div>

          {!isColaborador && (
            <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
              <Filter className="h-4 w-4 text-slate-500" />
              <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="bg-transparent outline-none max-w-[120px] truncate">
                <option value="all">Todos usuários</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </label>
          )}

          <button
            onClick={() => setShowOneTimeModal(true)}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            <Zap className="h-4 w-4" /> Tarefa extra
          </button>
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-1 rounded-lg border bg-white p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === id ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === "daily" && (
        <div className="space-y-5">
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                {doneCount} de {totalCount} concluídas no período
              </span>
              <span className={`font-semibold ${pct === 100 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                {pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full transition-all ${pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed bg-white py-14 text-center">
              <FolderCheck className="mb-3 h-8 w-8 text-slate-400" />
              <p className="font-medium text-slate-700">Nenhuma tarefa encontrada</p>
              <p className="mt-1 text-sm text-slate-500">
                {hideCompleted ? "Todas as tarefas do período já foram concluídas! 🎉" : "Nenhuma tarefa encontrada para os filtros selecionados."}
              </p>
            </div>
          ) : (
            grouped.map(([category, items]) => (
              <section key={category} className="overflow-hidden rounded-xl border bg-white">
                <header className="flex items-center justify-between border-b bg-slate-50 px-4 py-2.5">
                  <h2 className="text-sm font-semibold text-slate-700">{category}</h2>
                  <span className="text-xs text-slate-500">
                    {items.filter(isDone).length}/{items.length}
                  </span>
                </header>
                <ul className="divide-y">
                  {items.map((t) => {
                    const done = isDone(t);
                    const log = logs[t.id];
                    const itemSubtasks = subtasks[t.id] || [];
                    const isExpanded = !!expandedItems[t.id];
                    const completedSubs = itemSubtasks.filter((s) => s.completed).length;

                    return (
                      <li key={t.id} className="flex flex-col px-4 py-3">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleCheckClick(t)}
                            disabled={togglingId === t.id}
                            className="mt-0.5 shrink-0 disabled:opacity-50"
                            aria-label={done ? "Desmarcar" : "Concluir"}
                          >
                            {togglingId === t.id ? (
                              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            ) : done ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            ) : (
                              <Circle className="h-6 w-6 text-slate-300 hover:text-primary" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`font-medium ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                {t.title}
                              </p>
                              <button
                                onClick={() => setExpandedItems((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                              >
                                {itemSubtasks.length > 0 && (
                                  <span>{completedSubs}/{itemSubtasks.length} subtarefas</span>
                                )}
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </div>

                            {t.description && <p className="mt-0.5 text-sm text-slate-500">{t.description}</p>}
                            
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1 text-primary/80 font-medium">
                                <Building2 className="h-3.5 w-3.5" /> {t.empresa || "Todas / Grupo B&A"}
                              </span>
                              {t.setor && (
                                <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                  <Briefcase className="h-3.5 w-3.5" /> {t.setor}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <UserIcon className="h-3.5 w-3.5" /> Resp: {userName(t.assigned_to)}
                              </span>
                              {t.created_by && (
                                <span className="flex items-center gap-1 text-amber-700 font-medium">
                                  <ArrowUpRight className="h-3.5 w-3.5" /> Direcionado por: {userName(t.created_by)}
                                </span>
                              )}
                              {t.requires_input && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3.5 w-3.5" /> {t.input_label || "Requer valor"}
                                </span>
                              )}
                              {t.requires_photo && (
                                <span className="flex items-center gap-1">
                                  <Camera className="h-3.5 w-3.5" /> Requer foto
                                </span>
                              )}
                              {done && log?.completed_at && (
                                <span className="text-emerald-600">
                                  ✓ {userName(log.completed_by)} às{" "}
                                  {new Date(log.completed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>

                            {done && (log?.input_value || log?.photo_url) && (
                              <div className="mt-2 flex flex-wrap items-center gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
                                {log.input_value && (
                                  <span>
                                    <span className="text-slate-500">{t.input_label || "Valor"}:</span>{" "}
                                    <strong className="text-slate-800">{log.input_value}</strong>
                                  </span>
                                )}
                                {log.photo_url && (
                                  <a
                                    href={log.photo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <ImageIcon className="h-4 w-4" /> Ver foto
                                  </a>
                                )}
                              </div>
                            )}

                            {isExpanded && (
                              <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
                                <p className="text-xs font-semibold text-slate-600">Perguntas / Passos de Aprovação:</p>
                                {itemSubtasks.length === 0 ? (
                                  <p className="text-xs text-slate-400">Nenhuma pergunta ou passo adicionado.</p>
                                ) : (
                                  <ul className="space-y-3">
                                    {itemSubtasks.map((sub) => {
                                      const showComments = !!expandedSubtaskComments[sub.id];
                                      const commentsList = sub.comments || [];

                                      return (
                                        <li key={sub.id} className="rounded-lg bg-white p-2.5 border shadow-sm">
                                          <div className="flex items-start justify-between gap-2">
                                            <label className="flex items-start gap-2 cursor-pointer select-none flex-1">
                                              <input
                                                type="checkbox"
                                                checked={sub.completed}
                                                onChange={() => handleToggleSubtask(sub)}
                                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary mt-0.5 shrink-0"
                                              />
                                              <span className={`break-words text-sm font-medium ${sub.completed ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                                {sub.title}
                                                {sub.assigned_to && (
                                                  <span className="ml-2 inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                                    <UserIcon className="h-3 w-3" /> {userName(sub.assigned_to)}
                                                  </span>
                                                )}
                                              </span>
                                            </label>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                onClick={() => setExpandedSubtaskComments(prev => ({ ...prev, [sub.id]: !prev[sub.id] }))}
                                                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                                                  commentsList.length > 0 ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-100"
                                                }`}
                                                title="Comentários / Conversa"
                                              >
                                                <MessageSquare className="h-3.5 w-3.5" />
                                                <span>{commentsList.length}</span>
                                              </button>
                                              <button
                                                onClick={() => handleDeleteSubtask(sub)}
                                                className="text-slate-400 hover:text-red-600 p-1"
                                                title="Excluir"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Seção de Comentários (Sem caixa de seleção, formato balão de chat limpo) */}
                                          {showComments && (
                                            <div className="mt-3 border-t pt-2.5 space-y-2.5">
                                              {commentsList.length > 0 && (
                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                  {commentsList.map((c) => (
                                                    <div key={c.id} className="rounded-lg bg-slate-50 p-2.5 border text-xs shadow-xs">
                                                      <div className="flex items-center justify-between font-semibold text-slate-700 mb-1">
                                                        <span className="flex items-center gap-1 text-primary">
                                                          <UserIcon className="h-3 w-3" /> {userName(c.user_id)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-normal">
                                                          {new Date(c.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                                                        </span>
                                                      </div>
                                                      <p className="text-slate-700 whitespace-pre-wrap pl-4">{c.comment}</p>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}

                                              <form onSubmit={(e) => handleAddComment(sub, e)} className="flex gap-1.5 pt-1">
                                                <input
                                                  type="text"
                                                  placeholder="Escreva um comentário ou resposta..."
                                                  value={commentInputs[sub.id] || ""}
                                                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                                  className="flex-1 rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-primary"
                                                />
                                                <button
                                                  type="submit"
                                                  className="flex items-center justify-center rounded bg-primary px-3 py-1.5 text-white hover:bg-primary/90"
                                                  title="Enviar comentário"
                                                >
                                                  <Send className="h-3.5 w-3.5" />
                                                </button>
                                              </form>
                                            </div>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}

                                <form onSubmit={(e) => handleAddSubtask(t.id, e)} className="mt-3 flex flex-wrap gap-2 sm:flex-nowrap pt-2 border-t">
                                  <input
                                    type="text"
                                    placeholder="Adicionar nova pergunta ou passo..."
                                    value={newSubtaskTexts[t.id] || ""}
                                    onChange={(e) => setNewSubtaskTexts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                                    className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-primary min-w-[200px]"
                                  />
                                  <select
                                    value={newSubtaskAssignedTo[t.id] || ""}
                                    onChange={(e) => setNewSubtaskAssignedTo((prev) => ({ ...prev, [t.id]: e.target.value }))}
                                    className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-primary max-w-[140px] truncate"
                                  >
                                    <option value="">Equipe / Sem dono</option>
                                    {users.map((u) => (
                                      <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="submit"
                                    className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 shrink-0"
                                  >
                                    Adicionar
                                  </button>
                                </form>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      )}

      {activeTab === "reports" && !isColaborador && (
        <div className="space-y-4">
          {report.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white py-14 text-center text-sm text-slate-500">
              Nenhuma rotina prevista para os filtros selecionados neste período.
            </div>
          ) : (
            report.map((row) => {
              const p = row.total ? Math.round((row.done / row.total) * 100) : 0;
              return (
                <div key={row.id ?? "team"} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-slate-500" />
                      <span className="font-medium text-slate-800">{userName(row.id)}</span>
                    </div>
                    <span className="text-sm text-slate-600">
                      {row.done}/{row.total} ·{" "}
                      <strong className={p === 100 ? "text-emerald-600" : p >= 50 ? "text-amber-600" : "text-red-600"}>
                        {p}%
                      </strong>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${p === 100 ? "bg-emerald-500" : p >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  {row.pending.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Pendentes
                      </p>
                      <ul className="space-y-0.5 text-sm text-slate-600">
                        {row.pending.map((t) => (
                          <li key={t.id}>
                            {t.title} <span className="text-xs opacity-60">({t.empresa} - {t.setor})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "manage" && !isColaborador && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          <form onSubmit={handleSaveTemplate} className="h-fit space-y-4 rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{editingTemplateId ? "Editar rotina" : "Nova rotina"}</h2>
              {editingTemplateId && (
                <button type="button" onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-700" aria-label="Cancelar edição">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Empresa">
                <select value={newEmpresa} onChange={(e) => setNewEmpresa(e.target.value)} className={inputCls}>
                  {EMPRESAS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </Field>

              <Field label="Setor / Depto">
                <select value={newSetor} onChange={(e) => setNewSetor(e.target.value)} className={inputCls}>
                  {SETORES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Título *">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required className={inputCls} />
            </Field>
            <Field label="Descrição">
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} className={inputCls} />
            </Field>
            
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria">
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={inputCls}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Responsável">
                <select value={newAssignedTo} onChange={(e) => setNewAssignedTo(e.target.value)} className={inputCls}>
                  <option value="">Todos / Equipe</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Recorrência">
              <select
                value={newRecurrenceType}
                onChange={(e) => setNewRecurrenceType(e.target.value as RecurrenceType)}
                className={inputCls}
              >
                {(Object.keys(RECURRENCE_LABEL) as RecurrenceType[]).map((r) => (
                  <option key={r} value={r}>{RECURRENCE_LABEL[r]}</option>
                ))}
              </select>
            </Field>

            {newRecurrenceType === "monthly" && (
              <Field label="Dia do mês">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={newRecurrenceDay}
                  onChange={(e) => setNewRecurrenceDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
                  className={inputCls}
                />
              </Field>
            )}

            {newRecurrenceType === "custom" && (
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => handleToggleCustomDay(d.value)}
                    className={`rounded-md border px-2.5 py-1 text-sm ${
                      newCustomDays.includes(d.value) ? "border-primary bg-primary text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <span className="text-sm font-medium text-slate-700">Subtarefas Padrão (Passos)</span>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Verificar temperatura"
                    value={formSubtaskInput}
                    onChange={(e) => setFormSubtaskInput(e.target.value)}
                    className={inputCls + " flex-1"}
                  />
                  <select
                    value={formSubtaskAssignedTo}
                    onChange={(e) => setFormSubtaskAssignedTo(e.target.value)}
                    className={inputCls + " max-w-[130px] !px-2 truncate"}
                  >
                    <option value="">Equipe</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (formSubtaskInput.trim()) {
                        setFormSubtasks((prev) => [...prev, { title: formSubtaskInput.trim(), assigned_to: formSubtaskAssignedTo || null }]);
                        setFormSubtaskInput("");
                        setFormSubtaskAssignedTo("");
                      }
                    }}
                    className="rounded bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 shrink-0"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
              
              {formSubtasks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {formSubtasks.map((st, idx) => (
                    <li key={idx} className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 text-xs border">
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{st.title}</span>
                        {st.assigned_to && (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 shrink-0">
                            <UserIcon className="h-3 w-3" /> {userName(st.assigned_to)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 ml-2 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={newRequiresInput} onChange={(e) => setNewRequiresInput(e.target.checked)} />
                Exigir preenchimento de valor
              </label>
              {newRequiresInput && (
                <input
                  value={newInputLabel}
                  onChange={(e) => setNewInputLabel(e.target.value)}
                  placeholder="Ex.: Temperatura da câmara fria"
                  className={inputCls}
                />
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={newRequiresPhoto} onChange={(e) => setNewRequiresPhoto(e.target.checked)} />
                Exigir foto como comprovante
              </label>
            </div>

            <button
              type="submit"
              disabled={savingTemplate}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : editingTemplateId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingTemplateId ? "Salvar alterações" : "Adicionar rotina"}
            </button>
          </form>

          <div className="overflow-hidden rounded-xl border bg-white">
            <header className="flex justify-between items-center border-b bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
              <span>Rotinas cadastradas ({manageList.length})</span>
            </header>
            {manageList.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">Nenhuma rotina cadastrada para estes filtros.</p>
            ) : (
              <ul className="divide-y max-h-[700px] overflow-y-auto">
                {manageList.map((t) => (
                  <li key={t.id} className={`flex items-start gap-3 px-4 py-3 ${editingTemplateId === t.id ? "bg-primary/5" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800">
                        {t.is_one_time && <Zap className="mr-1 inline h-4 w-4 text-amber-500" />}
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 font-medium text-primary">
                         {t.empresa || "Todas / Grupo B&A"} {t.setor ? `· ${t.setor}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t.category} · {recurrenceText(t)} · {userName(t.assigned_to)}
                        {t.requires_input ? " · valor" : ""}
                        {t.requires_photo ? " · foto" : ""}
                      </p>
                    </div>
                    <button onClick={() => handleStartEdit(t)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeletingTemplate(t)} className="rounded p-1.5 text-red-500 hover:bg-red-50" aria-label="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {completingTemplate && (
        <Modal title={`Concluir: ${completingTemplate.title}`} onClose={() => !uploading && setCompletingTemplate(null)}>
          <form onSubmit={handleConfirmModalSubmit} className="space-y-4">
            {completingTemplate.requires_input && (
              <Field label={`${completingTemplate.input_label || "Valor"} *`}>
                <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} autoFocus className={inputCls} />
              </Field>
            )}
            {completingTemplate.requires_photo && (
              <Field label="Foto *">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
                />
                {photoFile && <p className="mt-1 text-xs text-slate-500">{photoFile.name}</p>}
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCompletingTemplate(null)} disabled={uploading} className="rounded-lg border px-4 py-2 text-sm">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Concluir
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showOneTimeModal && (
        <Modal title="Nova tarefa / Pedido de aprovação" onClose={() => setShowOneTimeModal(false)}>
          <form onSubmit={handleCreateOneTimeTask} className="space-y-4">
            <p className="text-sm text-slate-500">
              Ideal para pedidos de orçamento, aprovações e tarefas pontuais.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <Field label="Empresa">
                <select value={oneTimeEmpresa} onChange={(e) => setOneTimeEmpresa(e.target.value)} className={inputCls}>
                  {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </Field>

              <Field label="Setor / Depto">
                <select value={oneTimeSetor} onChange={(e) => setOneTimeSetor(e.target.value)} className={inputCls}>
                  {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Título *">
              <input value={oneTimeTitle} onChange={(e) => setOneTimeTitle(e.target.value)} required autoFocus className={inputCls} placeholder="Ex: Orçamento confraternização" />
            </Field>
            
            <Field label="Descrição / Detalhes">
              <textarea value={oneTimeDesc} onChange={(e) => setOneTimeDesc(e.target.value)} rows={2} className={inputCls} placeholder="Descreva os valores, links ou observações..." />
            </Field>
            
            <div className={`grid gap-3 ${isColaborador ? "" : "grid-cols-2"}`}>
              <Field label="Categoria">
                <select value={oneTimeCategory} onChange={(e) => setOneTimeCategory(e.target.value)} className={inputCls}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              {!isColaborador && (
                <Field label="Responsável Principal">
                  <select value={oneTimeAssignedTo} onChange={(e) => setOneTimeAssignedTo(e.target.value)} className={inputCls}>
                    <option value="">Todos / Equipe</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <span className="text-sm font-medium text-slate-700">Perguntas ou Passos de Aprovação</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Aprova este orçamento de R$ 920,00?"
                  value={oneTimeSubInput}
                  onChange={(e) => setOneTimeSubInput(e.target.value)}
                  className={inputCls + " flex-1"}
                />
                <select
                  value={oneTimeSubAssignedTo}
                  onChange={(e) => setOneTimeSubAssignedTo(e.target.value)}
                  className={inputCls + " max-w-[130px] !px-2 truncate"}
                >
                  <option value="">Equipe</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (oneTimeSubInput.trim()) {
                      setOneTimeFormSubtasks((prev) => [...prev, { title: oneTimeSubInput.trim(), assigned_to: oneTimeSubAssignedTo || null }]);
                      setOneTimeSubInput("");
                      setOneTimeSubAssignedTo("");
                    }
                  }}
                  className="rounded bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 shrink-0"
                >
                  Adicionar
                </button>
              </div>

              {oneTimeFormSubtasks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {oneTimeFormSubtasks.map((st, idx) => (
                    <li key={idx} className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 text-xs border">
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{st.title}</span>
                        {st.assigned_to && (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 shrink-0">
                            <UserIcon className="h-3 w-3" /> {userName(st.assigned_to)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOneTimeFormSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 ml-2 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowOneTimeModal(false)} className="rounded-lg border px-4 py-2 text-sm">
                Cancelar
              </button>
              <button type="submit" className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                <Zap className="h-4 w-4" /> Criar tarefa e enviar
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deletingTemplate}
        onOpenChange={(o) => !o && setDeletingTemplate(null)}
        title="Excluir rotina?"
        description={`"${deletingTemplate?.title ?? ""}" e todo o seu histórico de conclusões serão removidos.`}
        confirmLabel="Excluir"
        onConfirm={handleDeleteTemplate}
      />
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}