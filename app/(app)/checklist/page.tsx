"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  Send,
  ListTodo,
  ThumbsUp,
  Clock,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createClient } from "@/lib/supabase/client";

// --- Tipagens ---
interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string; // Ex: 'admin', 'diretor', 'gestor', 'member'
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
  due_date?: string | null;
  accepted?: boolean;
  accepted_at?: string | null;
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

// --- Componente Inteligente de Menção (@) ---
function MentionInput({
  value,
  onChange,
  onSubmit,
  users,
  placeholder,
  buttonLabel = "Adicionar",
  isComment = false
}: {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (text: string, assignedTo: string | null) => void;
  users: Profile[];
  placeholder: string;
  buttonLabel?: string;
  isComment?: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    return users.filter(u =>
      (u.full_name || u.email || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\s]*)$/);

    if (match) {
      setSearch(match[1]);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }

    if (!val.includes("@")) setAssignedUserId(null);
  };

  const handleSelectUser = (user: Profile) => {
    const cursor = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursor);
    const textAfterCursor = value.slice(cursor);

    const start = textBeforeCursor.lastIndexOf("@");
    if (start !== -1) {
      const newText = value.slice(0, start) + `@${user.full_name || user.email} ` + textAfterCursor;
      onChange(newText);
      setAssignedUserId(user.id);
      setShowDropdown(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && filteredUsers.length > 0 && e.key === 'Enter') {
      e.preventDefault();
      handleSelectUser(filteredUsers[0]);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onSubmit(value, assignedUserId);
        setAssignedUserId(null);
        setShowDropdown(false);
      }}
      className={`relative flex flex-1 gap-1.5 ${isComment ? "pt-1" : ""}`}
    >
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={`w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-primary ${isComment ? "bg-slate-50 border-slate-200" : ""}`}
          autoComplete="off"
        />
        {showDropdown && (
          <div className="absolute bottom-full mb-1 left-0 w-64 max-h-48 overflow-y-auto rounded-lg border bg-white shadow-xl z-50">
            {filteredUsers.length === 0 ? (
              <p className="p-2 text-xs text-slate-500">Nenhum utilizador encontrado.</p>
            ) : (
              <ul className="py-1">
                {filteredUsers.map(u => (
                  <li
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className="cursor-pointer px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 font-medium"
                  >
                    <UserIcon className="h-3 w-3 text-slate-400" />
                    {u.full_name || u.email}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <button
        type="submit"
        className={`flex items-center justify-center rounded bg-primary text-white hover:bg-primary/90 shrink-0 font-medium ${isComment ? "px-3 py-1.5" : "px-4 py-1.5 text-xs"}`}
        title={buttonLabel}
      >
        {isComment ? <Send className="h-3.5 w-3.5" /> : buttonLabel}
      </button>
    </form>
  );
}

// --- Constantes e Helpers ---
const DAYS_OF_WEEK = [
  { label: "Dom", value: 0 }, { label: "Seg", value: 1 }, { label: "Ter", value: 2 },
  { label: "Qua", value: 3 }, { label: "Qui", value: 4 }, { label: "Sex", value: 5 }, { label: "Sáb", value: 6 },
];

const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  daily: "Todos os dias", weekdays: "Dias úteis (seg–sex)", weekends: "Fins de semana",
  monthly: "Mensal", custom: "Dias específicos",
};

const CATEGORIES = ["Geral", "Abertura", "Fechamento", "Limpeza", "Estoque", "Financeiro", "Atendimento", "Urgente"];

const EMPRESAS = [
  "Todas / Grupo B&A", "Serra Carioca", "Feitoria Cozinha", "Casa Cônego",
  "Savá Padaria", "Rua Burguer", "Feito Brasa", "Produção Central", "Distribuidora",
];

const SETORES = [
  "Geral / Todos", "Gestão & ADM", "Marketing & Comunicação", "Financeiro & Controladoria",
  "Operacional / Salão", "Cozinha & Produção", "Compras & Suprimentos",
];

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(value: string) {
  if (!value) return new Date();
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
    case "weekdays": return dow >= 1 && dow <= 5;
    case "weekends": return dow === 0 || dow === 6;
    case "monthly": {
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const target = Math.min(t.recurrence_day ?? 1, lastDay);
      return date.getDate() === target;
    }
    case "custom": return (t.custom_days ?? []).includes(dow);
    default: return true;
  }
}

function recurrenceText(t: Template) {
  if (t.is_one_time) return "Tarefa pontual";
  if (t.recurrence_type === "monthly") return `Mensal — dia ${t.recurrence_day ?? 1}`;
  if (t.recurrence_type === "custom") {
    const days = DAYS_OF_WEEK.filter((d) => (t.custom_days ?? []).includes(d.value)).map((d) => d.label);
    return days.length ? days.join(", ") : "Nenhum dia selecionado";
  }
  return RECURRENCE_LABEL[t.recurrence_type] ?? "Todos os dias";
}

// --- Página Principal ---
export default function ChecklistPage() {
  const [supabase] = useState(() => createClient());
  const [activeTab, setActiveTab] = useState<"daily" | "tasks" | "reports" | "rh_report" | "manage">("daily");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<Record<string, Log>>({});
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  const [newSubtaskTexts, setNewSubtaskTexts] = useState<Record<string, string>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const [oneTimeDoneBefore, setOneTimeDoneBefore] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);
  
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
  const [editingOneTimeId, setEditingOneTimeId] = useState<string | null>(null);
  const [oneTimeTitle, setOneTimeTitle] = useState("");
  const [oneTimeDesc, setOneTimeDesc] = useState("");
  const [oneTimeCategory, setOneTimeCategory] = useState("Geral");
  const [oneTimeAssignedTo, setOneTimeAssignedTo] = useState("");
  const [oneTimeEmpresa, setOneTimeEmpresa] = useState("");
  const [oneTimeSetor, setOneTimeSetor] = useState("Geral / Todos");
  const [oneTimeDueDate, setOneTimeDueDate] = useState("");
  const [oneTimeFormSubtasks, setOneTimeFormSubtasks] = useState<FormSubtask[]>([]);
  const [oneTimeSubInput, setOneTimeSubInput] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);

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

  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);

  const userRole = currentUserProfile?.role ?? "member";
  const isColaborador = userRole === "member";
  const isDiretor = userRole === "diretor";
  const isGestor = userRole === "gestor";

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => { if (currentUser) fetchNotifications(); }, [currentUser]);
  useEffect(() => { fetchLogs(); }, [startDate, endDate]);

  async function fetchInitialData() {
    setLoading(true);
    let profileData: Profile | null = null;
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      setCurrentUser(userData.user.id);
      const { data: myProfile } = await supabase.from("profiles").select("id, full_name, email, role, empresas").eq("id", userData.user.id).single();
      if (myProfile) {
        profileData = myProfile;
        setCurrentUserProfile(myProfile);
        setFilterUser(myProfile.id);
        if (myProfile.role === "member" && myProfile.empresas?.length === 1) {
           setFilterEmpresa(myProfile.empresas[0]);
        }
      }
    }

    const { data: profilesData } = await supabase.from("profiles").select("id, full_name, email, role, empresas").order("full_name", { ascending: true });
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
    const { data } = await supabase.from("notifications").select("*").eq("user_id", currentUser).order("created_at", { ascending: false }).limit(10);
    if (data) setNotifications(data);
  }

  async function markNotificationAsRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function fetchSubtasks(templateIds: string[]) {
    if (!templateIds.length) return;
    const { data, error } = await supabase.from("checklist_subtasks").select("*").in("checklist_item_id", templateIds);

    if (!error && data) {
      const subtaskIds = data.map((s: Subtask) => s.id);
      let commentsMap: Record<string, SubtaskComment[]> = {};
      
      if (subtaskIds.length > 0) {
        const { data: commentsData } = await supabase.from("checklist_subtask_comments").select("*").in("subtask_id", subtaskIds).order("created_at", { ascending: true });
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
        map[s.checklist_item_id].push({ ...s, comments: commentsMap[s.id] || [] });
      });
      setSubtasks(map);
    }
  }

  async function fetchLogs() {
    const { data: lgData, error } = await supabase.from("daily_checklist_logs").select("*").gte("date", startDate).lte("date", endDate).order("date", { ascending: true });
    if (error) { toast.error("Erro ao carregar registros"); return; }
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
    const { data, error } = await supabase.from("checklist_subtasks").update({ completed: updatedStatus }).eq("id", subtask.id).select().single();
    if (error) return void toast.error("Erro ao atualizar subtarefa");
    if (data) {
      setSubtasks((prev) => ({
        ...prev,
        [subtask.checklist_item_id]: (prev[subtask.checklist_item_id] || []).map((s) => s.id === subtask.id ? { ...data, comments: s.comments } : s),
      }));
    }
  }

  async function handleAddComment(subtask: Subtask, text: string, assignedUserId: string | null) {
    if (!text || !currentUser) return;

    const { data, error } = await supabase.from("checklist_subtask_comments").insert({
      subtask_id: subtask.id,
      user_id: currentUser,
      comment: text,
    }).select().single();

    if (error) return void toast.error("Erro ao enviar comentário");

    if (data) {
      setSubtasks((prev) => ({
        ...prev,
        [subtask.checklist_item_id]: (prev[subtask.checklist_item_id] || []).map((s) =>
          s.id === subtask.id ? { ...s, comments: [...(s.comments || []), data] } : s
        ),
      }));
      setCommentInputs((prev) => ({ ...prev, [subtask.id]: "" }));

      const targetUserId = assignedUserId || (subtask.assigned_to !== currentUser ? subtask.assigned_to : null);
      if (targetUserId) {
        const senderName = currentUserProfile?.full_name || "Alguém";
        await supabase.from("notifications").insert({
          user_id: targetUserId,
          title: "Novo comentário / menção",
          message: `${senderName} respondeu/marcou-o: "${text}"`,
        });
        fetchNotifications();
      }
    }
  }

  async function handleAddSubtask(templateId: string, text: string, assignedUserId: string | null) {
    const { data, error } = await supabase.from("checklist_subtasks").insert({ 
      checklist_item_id: templateId, 
      title: text, 
      completed: false,
      assigned_to: assignedUserId
    }).select().single();

    if (error) return void toast.error("Erro ao adicionar passo/pergunta");

    if (data) {
      setSubtasks((prev) => ({
        ...prev,
        [templateId]: [...(prev[templateId] || []), { ...data, comments: [] }],
      }));
      setNewSubtaskTexts((prev) => ({ ...prev, [templateId]: "" }));

      if (assignedUserId) {
        const senderName = currentUserProfile?.full_name || "Alguém";
        await supabase.from("notifications").insert({
          user_id: assignedUserId,
          title: "Nova pergunta / passo",
          message: `${senderName} marcou-o: "${text}"`,
        });
        fetchNotifications();
      }
      toast.success("Adicionado!");
    }
  }

  async function handleDeleteSubtask(subtask: Subtask) {
    const { error } = await supabase.from("checklist_subtasks").delete().eq("id", subtask.id);
    if (error) return void toast.error("Erro ao remover");
    setSubtasks((prev) => ({
      ...prev,
      [subtask.checklist_item_id]: (prev[subtask.checklist_item_id] || []).filter((s) => s.id !== subtask.id),
    }));
  }

  async function handleAcceptTask(template: Template) {
    setTogglingId(template.id);
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from("daily_checklist_templates").update({ accepted: true, accepted_at: nowIso }).eq("id", template.id);
    setTogglingId(null);
    if (error) return void toast.error("Erro ao aceitar a tarefa.");
    
    setTemplates((prev) => prev.map((t) => t.id === template.id ? { ...t, accepted: true, accepted_at: nowIso } : t));
    toast.success("Tarefa aceita com sucesso!");
    
    if (template.created_by && template.created_by !== currentUser) {
      const senderName = currentUserProfile?.full_name || "Alguém";
      await supabase.from("notifications").insert({
        user_id: template.created_by,
        title: "Tarefa Aceita",
        message: `${senderName} aceitou e iniciou a tarefa: "${template.title}"`,
      });
      fetchNotifications();
    }
  }

  async function handleCheckClick(template: Template) {
    if (template.is_one_time && template.assigned_to && !template.accepted && template.assigned_to === currentUser) {
      return toast.info("Você precisa aceitar a tarefa antes de marcá-la como concluída.");
    }

    const currentLog = logs[template.id];
    const isCompleted = !!currentLog?.completed;
    if (isCompleted) {
      setTogglingId(template.id);
      const { data, error } = await supabase.from("daily_checklist_logs").update({ completed: false, completed_at: null, completed_by: currentUser }).eq("id", currentLog.id).select().single();
      setTogglingId(null);
      if (error) return void toast.error("Não foi possível desmarcar", { description: error.message });
      if (data) setLogs((prev) => ({ ...prev, [template.id]: data }));
    } else {
      if (template.requires_input || template.requires_photo) {
        setCompletingTemplate(template); setInputValue(""); setPhotoFile(null);
      } else {
        setTogglingId(template.id);
        await submitCompletion(template.id, template.assigned_to, null, null);
        setTogglingId(null);
      }
    }
  }

  async function submitCompletion(templateId: string, assignedTo: string | null, val: string | null, photoUrl: string | null) {
    setUploading(true);
    const currentLog = logs[templateId];
    const targetDate = startDate;

    const result = currentLog
        ? await supabase.from("daily_checklist_logs").update({ completed: true, completed_at: new Date().toISOString(), completed_by: currentUser, input_value: val, photo_url: photoUrl || currentLog.photo_url }).eq("id", currentLog.id).select().single()
        : await supabase.from("daily_checklist_logs").insert({ template_id: templateId, completed: true, completed_at: new Date().toISOString(), completed_by: currentUser, assigned_to: assignedTo, date: targetDate, input_value: val, photo_url: photoUrl }).select().single();

    setUploading(false);
    if (result.error) return void toast.error("Não foi possível concluir");
    if (result.data) setLogs((prev) => ({ ...prev, [templateId]: result.data }));
    setCompletingTemplate(null);
  }

  async function handleConfirmModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!completingTemplate) return;
    if (completingTemplate.requires_input && !inputValue.trim()) return void toast.error(`Preencha o campo exigido.`);
    if (completingTemplate.requires_photo && !photoFile) return void toast.error("Anexe a foto para concluir.");

    let photoUrl: string | null = null;
    if (photoFile) {
      setUploading(true);
      const fileName = `${completingTemplate.id}_${Date.now()}.${photoFile.name.split(".").pop()}`;
      const filePath = `checklist/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("checklist-photos").upload(filePath, photoFile);
      if (uploadError) { setUploading(false); return void toast.error("Falha no envio da foto"); }
      const { data: publicUrlData } = supabase.storage.from("checklist-photos").getPublicUrl(filePath);
      photoUrl = publicUrlData.publicUrl;
    }
    await submitCompletion(completingTemplate.id, completingTemplate.assigned_to, inputValue || null, photoUrl);
  }

  function handleOpenNewOneTimeTask() {
    setEditingOneTimeId(null);
    setOneTimeTitle("");
    setOneTimeDesc("");
    setOneTimeCategory("Geral");
    setOneTimeAssignedTo("");
    setOneTimeEmpresa("");
    setOneTimeSetor("Geral / Todos");
    setOneTimeDueDate("");
    setOneTimeFormSubtasks([]);
    setShowOneTimeModal(true);
  }

  function handleEditOneTimeTask(template: Template) {
    setEditingOneTimeId(template.id);
    setOneTimeTitle(template.title);
    setOneTimeDesc(template.description || "");
    setOneTimeCategory(template.category || "Geral");
    setOneTimeAssignedTo(template.assigned_to || "");
    setOneTimeEmpresa(template.empresa || "Todas / Grupo B&A");
    setOneTimeSetor(template.setor || "Geral / Todos");
    setOneTimeDueDate(template.due_date ? template.due_date.split("T")[0] : "");
    
    const currentSubs = subtasks[template.id] || [];
    setOneTimeFormSubtasks(currentSubs.map(s => ({ title: s.title, assigned_to: s.assigned_to || null })));
    setShowOneTimeModal(true);
  }

  async function handleSaveOneTimeTask(e: React.FormEvent) {
    e.preventDefault();
    if (!oneTimeTitle.trim() || isSavingTask) return;

    setIsSavingTask(true);

    const targetUser = isColaborador ? currentUser : oneTimeAssignedTo || null;
    const payload = {
      title: oneTimeTitle, 
      description: oneTimeDesc, 
      category: oneTimeCategory, 
      empresa: oneTimeEmpresa || "Todas / Grupo B&A",
      setor: oneTimeSetor || "Geral / Todos", 
      assigned_to: targetUser, 
      due_date: oneTimeDueDate || null,
      recurrence_type: "daily" as RecurrenceType, 
      is_one_time: true,
      accepted: targetUser === currentUser || !targetUser ? true : false
    };

    let result;
    if (editingOneTimeId) {
       result = await supabase.from("daily_checklist_templates").update(payload).eq("id", editingOneTimeId).select().single();
    } else {
       result = await supabase.from("daily_checklist_templates").insert({ ...payload, created_by: currentUser }).select().single();
    }

    if (result.error) {
      setIsSavingTask(false);
      return void toast.error("Não foi possível salvar a tarefa");
    }

    const data = result.data as Template;
    
    if (data) {
      if (oneTimeFormSubtasks.length > 0 && !editingOneTimeId) {
        const subtaskInserts = oneTimeFormSubtasks.map((st) => ({ checklist_item_id: data.id, title: st.title, assigned_to: st.assigned_to, completed: false }));
        const { data: insertedSubs } = await supabase.from("checklist_subtasks").insert(subtaskInserts).select();
        if (insertedSubs) {
          for (const sub of insertedSubs) {
            if (sub.assigned_to) {
              const senderName = currentUserProfile?.full_name || "Alguém";
              await supabase.from("notifications").insert({ user_id: sub.assigned_to, title: "Nova pergunta / aprovação", message: `${senderName} marcou-o: "${sub.title}"` });
            }
          }
        }
        fetchSubtasks([data.id]);
      }
      
      if (editingOneTimeId) {
        setTemplates((prev) => prev.map(t => t.id === editingOneTimeId ? data : t));
        toast.success("Tarefa atualizada!");
      } else {
        setTemplates((prev) => [...prev, data]);
        toast.success("Tarefa criada com sucesso!");
        if (targetUser && targetUser !== currentUser) {
          const senderName = currentUserProfile?.full_name || "Alguém";
          await supabase.from("notifications").insert({ user_id: targetUser, title: "Nova Tarefa Recebida", message: `${senderName} enviou uma tarefa: "${data.title}"` });
        }
      }
      
      setShowOneTimeModal(false);
      setActiveTab("tasks");
    }
    setIsSavingTask(false);
  }

  function handleToggleCustomDay(dayVal: number) {
    setNewCustomDays((prev) => (prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal]));
  }

  async function handleStartEdit(template: Template) {
    setEditingTemplateId(template.id);
    setNewTitle(template.title); setNewDesc(template.description || ""); setNewCategory(template.category || "Geral");
    setNewEmpresa(template.empresa || "Todas / Grupo B&A"); setNewSetor(template.setor || "Geral / Todos");
    setNewAssignedTo(template.assigned_to || ""); setNewRecurrenceType(template.recurrence_type || "daily");
    setNewRecurrenceDay(template.recurrence_day || 1); setNewCustomDays(template.custom_days || []);
    setNewRequiresInput(template.requires_input || false); setNewInputLabel(template.input_label || ""); setNewRequiresPhoto(template.requires_photo || false);
    const currentSubs = subtasks[template.id] || [];
    setFormSubtasks(currentSubs.map((s) => ({ title: s.title, assigned_to: s.assigned_to || null })));
    setFormSubtaskInput("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingTemplateId(null); setNewTitle(""); setNewDesc(""); setNewCategory("Geral");
    setNewEmpresa("Todas / Grupo B&A"); setNewSetor("Geral / Todos"); setNewAssignedTo("");
    setNewRecurrenceType("daily"); setNewRecurrenceDay(1); setNewCustomDays([]);
    setNewRequiresInput(false); setNewInputLabel(""); setNewRequiresPhoto(false); setFormSubtasks([]); setFormSubtaskInput("");
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (newRecurrenceType === "custom" && newCustomDays.length === 0) return void toast.error("Selecione ao menos um dia.");

    const payload = {
      title: newTitle, description: newDesc, category: newCategory, empresa: newEmpresa || "Todas / Grupo B&A", setor: newSetor || "Geral / Todos",
      assigned_to: newAssignedTo || null, recurrence_type: newRecurrenceType, recurrence_day: newRecurrenceType === "monthly" ? newRecurrenceDay : null,
      custom_days: newRecurrenceType === "custom" ? [...newCustomDays].sort() : null, requires_input: newRequiresInput, input_label: newRequiresInput ? newInputLabel || null : null, requires_photo: newRequiresPhoto,
    };

    setSavingTemplate(true);
    const result = editingTemplateId
      ? await supabase.from("daily_checklist_templates").update(payload).eq("id", editingTemplateId).select().single()
      : await supabase.from("daily_checklist_templates").insert({ ...payload, created_by: currentUser, is_one_time: false }).select().single();

    if (result.error) { setSavingTemplate(false); return void toast.error("Erro ao salvar"); }
    const saved = result.data as Template;
    if (formSubtasks.length > 0) {
      const subtaskInserts = formSubtasks.map((st) => ({ checklist_item_id: saved.id, title: st.title, assigned_to: st.assigned_to, completed: false }));
      await supabase.from("checklist_subtasks").insert(subtaskInserts);
    }
    setSavingTemplate(false);
    setTemplates((prev) => editingTemplateId ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved]);
    toast.success(editingTemplateId ? "Rotina atualizada." : "Rotina criada.");
    handleCancelEdit(); fetchSubtasks([saved.id]);
  }

  async function handleDeleteTemplate() {
    if (!deletingTemplate) return;
    await supabase.from("daily_checklist_templates").delete().eq("id", deletingTemplate.id);
    setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id));
    if (editingTemplateId === deletingTemplate.id) handleCancelEdit();
    toast.success("Excluído com sucesso.");
  }

  const userName = (id: string | null) => {
    if (!id) return "Todos / Equipe";
    const u = users.find((x) => x.id === id);
    return u?.full_name || u?.email || "—";
  };

  const visibleUsers = useMemo(() => {
    return users.filter(u => {
      const emailOrName = (u.email || "").toLowerCase() + " " + (u.full_name || "").toLowerCase();
      if (emailOrName.includes("almeida.gabriel")) return false;

      if (isDiretor) {
        if (u.role === "diretor" && u.id !== currentUser) return false;
      }
      return true;
    });
  }, [users, isDiretor, currentUser]);

  const dueInRange = useMemo(() => {
    return templates.filter((t) => {
      const assignedUser = users.find(u => u.id === t.assigned_to);
      const isAlmeidaGabriel = assignedUser && ((assignedUser.email || "").toLowerCase().includes("almeida.gabriel") || (assignedUser.full_name || "").toLowerCase().includes("almeida.gabriel"));
      if (isAlmeidaGabriel) return false;

      // Restrições de Diretor
      if (isDiretor && t.assigned_to) {
        if (assignedUser?.role === "diretor" && t.assigned_to !== currentUser) {
          return false;
        }
      }

      // Restrições de Gestor (só vê tarefas que tem vínculo direto: ele criou ou foi atribuída a ele)
      if (isGestor) {
        const isMyTask = t.assigned_to === currentUser || t.created_by === currentUser;
        const subtaskAssignedToMe = (subtasks[t.id] || []).some(s => s.assigned_to === currentUser);
        if (!isMyTask && !subtaskAssignedToMe) return false;
      }

      if (t.is_one_time) {
        if (oneTimeDoneBefore.has(t.id)) return false;
        return true;
      }
      
      if (t.created_at && toLocalDateString(t.created_at) > endDate) return false;
      let curr = new Date(parseLocalDate(startDate));
      const end = parseLocalDate(endDate);
      while (curr <= end) {
        if (isDueOn(t, `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(curr.getDate()).padStart(2, "0")}`)) return true;
        curr.setDate(curr.getDate() + 1);
      }
      return false;
    });
  }, [templates, startDate, endDate, oneTimeDoneBefore, isDiretor, isGestor, users, currentUser, subtasks]);

  const isDone = (t: Template) => !!logs[t.id]?.completed;

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

      // Se for colaborador, garante que ele vê tarefas enviadas a diretores/gestores destinadas a ele
      if (isColaborador) {
        const assignedToMe = t.assigned_to === currentUser || itemSubs.some(s => s.assigned_to === currentUser);
        if (!assignedToMe && t.assigned_to) return false;
      }

      return matchesUser && matchesEmpresa && matchesSetor && hasAccessToEmpresa && (!hideCompleted || !isDone(t));
    });
  }, [dueInRange, filterUser, filterEmpresa, filterSetor, isColaborador, currentUserProfile, subtasks, hideCompleted, logs, currentUser]);

  const routineTasks = useMemo(() => visibleTasks.filter(t => !t.is_one_time), [visibleTasks]);
  const oneOffTasks = useMemo(() => visibleTasks.filter(t => t.is_one_time), [visibleTasks]);

  const currentTabTasks = activeTab === "daily" ? routineTasks : activeTab === "tasks" ? oneOffTasks : [];

  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    currentTabTasks.forEach((t) => {
      const key = t.category || "Geral";
      map.set(key, [...(map.get(key) ?? []), t]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [currentTabTasks]);

  const doneCount = currentTabTasks.filter(isDone).length;
  const totalCount = currentTabTasks.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const report = useMemo(() => {
    const targetUsersForReport = visibleUsers;
    const rows: { id: string | null; total: number; done: number; pending: Template[] }[] = [];

    targetUsersForReport.forEach(u => {
      const userTasks = visibleTasks.filter(t => t.assigned_to === u.id);
      let done = 0;
      userTasks.forEach(t => { if (isDone(t)) done++; });
      rows.push({
        id: u.id,
        total: userTasks.length,
        done: done,
        pending: userTasks.filter(t => !isDone(t))
      });
    });

    return rows.sort((a, b) => b.total - a.total);
  }, [visibleUsers, visibleTasks, logs]);

  // Cálculos para o Relatório RH (Incluindo Rotinas Diárias e Tarefas)
  const rhReportData = useMemo(() => {
    let totalAssigned = 0;
    let totalCompleted = 0;
    let totalNotDone = 0;
    let totalAcceptTimeMinutes = 0;
    let acceptCount = 0;

    templates.forEach(t => {
      const assignedUser = users.find(u => u.id === t.assigned_to);
      const isAlmeidaGabriel = assignedUser && ((assignedUser.email || "").toLowerCase().includes("almeida.gabriel") || (assignedUser.full_name || "").toLowerCase().includes("almeida.gabriel"));
      if (isAlmeidaGabriel) return;

      totalAssigned++;
      if (logs[t.id]?.completed) {
        totalCompleted++;
      } else {
        totalNotDone++;
      }

      if (t.accepted && t.created_at && t.accepted_at) {
        const created = new Date(t.created_at).getTime();
        const accepted = new Date(t.accepted_at).getTime();
        const diffMin = Math.max(0, (accepted - created) / (1000 * 60));
        totalAcceptTimeMinutes += diffMin;
        acceptCount++;
      }
    });

    const avgAcceptTimeHours = acceptCount > 0 ? (totalAcceptTimeMinutes / acceptCount / 60).toFixed(1) : "0";
    const uncompletedIndex = totalAssigned > 0 ? Math.round((totalNotDone / totalAssigned) * 100) : 0;

    return {
      totalAssigned,
      totalCompleted,
      totalNotDone,
      avgAcceptTimeHours,
      uncompletedIndex,
    };
  }, [templates, logs, users]);

  const manageList = useMemo(() => {
    let filtered = templates.filter((t) => !t.is_one_time);
    if (filterEmpresa !== "all") filtered = filtered.filter(t => t.empresa === filterEmpresa || t.empresa === "Todas / Grupo B&A");
    if (filterSetor !== "all") filtered = filtered.filter(t => t.setor === filterSetor || t.setor === "Geral / Todos");
    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  }, [templates, filterEmpresa, filterSetor]);

  if (loading) return <div className="flex h-[50vh] items-center justify-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const tabs = [
    { id: "daily" as const, label: "Rotinas Diárias", icon: CheckSquare },
    { id: "tasks" as const, label: "Gerenciamento de Tarefas", icon: ListTodo },
    ...(!isColaborador ? [
      { id: "reports" as const, label: "Acompanhamento", icon: Users },
      { id: "rh_report" as const, label: "Relatório RH", icon: BarChart3 },
      { id: "manage" as const, label: "Gerenciar Rotinas", icon: Repeat }
    ] : []),
  ];

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const todayStr = todayLocal();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header e Filtros */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {activeTab === "daily" ? "Rotinas Diárias" : activeTab === "tasks" ? "Gerenciamento de Tarefas" : activeTab === "rh_report" ? "Relatório de RH" : "Checklist e Tarefas"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeTab === "daily" 
              ? "Acompanhe e valide as rotinas operacionais recorrentes." 
              : activeTab === "tasks" 
                ? "Gestão de tarefas pontuais, pedidos e aprovações com prazos." 
                : activeTab === "rh_report"
                  ? "Indicadores de desempenho, tempo de aceite e tarefas não realizadas (Rotinas e Tarefas)."
                  : "Gestão operacional e acompanhamento de equipe."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          
          <button onClick={() => setHideCompleted(!hideCompleted)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${hideCompleted ? "bg-primary text-white border-primary" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
            {hideCompleted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{hideCompleted ? "Ocultando concluídas" : "Mostrar concluídas"}</span>
          </button>

          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative flex items-center justify-center rounded-lg border bg-white p-2.5 text-slate-600 hover:bg-slate-50">
              <Bell className="h-4 w-4" />
              {unreadNotificationsCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unreadNotificationsCount}</span>}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-white p-3 shadow-xl z-50">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <span className="font-semibold text-sm text-slate-800">Notificações</span>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
                </div>
                {notifications.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">Nenhuma notificação</p> : (
                  <ul className="max-h-60 overflow-y-auto space-y-2">
                    {notifications.map((n) => (
                      <li key={n.id} onClick={() => markNotificationAsRead(n.id)} className={`cursor-pointer rounded-lg p-2.5 text-xs transition-colors ${n.read ? "bg-slate-50 text-slate-600" : "bg-primary/10 text-slate-900 font-medium"}`}>
                        <p className="font-semibold">{n.title}</p>
                        <p className="mt-0.5">{n.message}</p>
                        <span className="mt-1 block text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString("pt-BR")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
            <Building2 className="h-4 w-4 text-slate-500" />
            <select value={filterEmpresa} onChange={(e) => setFilterEmpresa(e.target.value)} className="bg-transparent outline-none max-w-[130px] truncate">
              <option value="all">Todas Empresas</option>
              {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
            <Briefcase className="h-4 w-4 text-slate-500" />
            <select value={filterSetor} onChange={(e) => setFilterSetor(e.target.value)} className="bg-transparent outline-none max-w-[130px] truncate">
              <option value="all">Todos Setores</option>
              {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <div className="flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-sm">
            <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
            <input type="date" value={startDate} onChange={(e) => e.target.value && setStartDate(e.target.value)} className="bg-transparent outline-none cursor-pointer text-xs" />
            <span className="text-slate-400">até</span>
            <input type="date" value={endDate} onChange={(e) => e.target.value && setEndDate(e.target.value)} className="bg-transparent outline-none cursor-pointer text-xs" />
            <button type="button" onClick={() => { const t = todayLocal(); setStartDate(t); setEndDate(t); }} className={`ml-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${startDate === todayLocal() && endDate === todayLocal() ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              Hoje
            </button>
          </div>

          {!isColaborador && (
            <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
              <Filter className="h-4 w-4 text-slate-500" />
              <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="bg-transparent outline-none max-w-[120px] truncate">
                <option value="all">Todos usuários</option>
                {visibleUsers.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </label>
          )}

          <button onClick={handleOpenNewOneTimeTask} className="flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600">
            <Zap className="h-4 w-4" /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      {tabs.length > 1 && (
        <div className="flex gap-1 rounded-lg border bg-white p-1 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === id ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"}`}>
              <Icon className="h-4 w-4" /> <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Renderização da Lista */}
      {(activeTab === "daily" || activeTab === "tasks") && (
        <div className="space-y-5">
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{doneCount} de {totalCount} concluídas {activeTab === "daily" ? "na rotina" : "nas tarefas"}</span>
              <span className={`font-semibold ${pct === 100 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full transition-all ${pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {currentTabTasks.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed bg-white py-14 text-center">
              <FolderCheck className="mb-3 h-8 w-8 text-slate-400" />
              <p className="font-medium text-slate-700">Nenhum item encontrado</p>
              <p className="text-sm text-slate-500 mt-1">
                {activeTab === "tasks" ? "Nenhuma tarefa criada ou visível nos filtros." : "Nenhuma rotina diária para exibir."}
              </p>
            </div>
          ) : (
            grouped.map(([category, items]) => (
              <section key={category} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <header className="flex items-center justify-between border-b bg-slate-50 px-4 py-2.5">
                  <h2 className="text-sm font-semibold text-slate-700">{category}</h2>
                  <span className="text-xs text-slate-500">{items.filter(isDone).length}/{items.length}</span>
                </header>
                <ul className="divide-y">
                  {items.map((t) => {
                    const done = isDone(t);
                    const log = logs[t.id];
                    const itemSubtasks = subtasks[t.id] || [];
                    const isExpanded = !!expandedItems[t.id];
                    const completedSubs = itemSubtasks.filter((s) => s.completed).length;

                    const requiresAcceptance = t.is_one_time && t.assigned_to && !t.accepted;
                    const canAccept = requiresAcceptance && t.assigned_to === currentUser;
                    const isOverdue = t.due_date && t.due_date < todayStr && !done;

                    return (
                      <li key={t.id} className={`flex flex-col px-4 py-4 ${requiresAcceptance ? "bg-amber-50/30" : ""}`}>
                        <div className="flex items-start gap-3">
                          <button onClick={() => handleCheckClick(t)} disabled={togglingId === t.id} className="mt-0.5 shrink-0 disabled:opacity-50">
                            {togglingId === t.id ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : done ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Circle className="h-6 w-6 text-slate-300 hover:text-primary" />}
                          </button>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-medium ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>{t.title}</p>
                                
                                {t.due_date && (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${done ? "bg-slate-100 text-slate-500 border-slate-200" : isOverdue ? "bg-red-50 text-red-600 border-red-200" : t.due_date === todayStr ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>
                                    <Clock className="h-3 w-3" /> 
                                    Prazo: {new Date(t.due_date + "T00:00:00").toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {t.is_one_time && (t.created_by === currentUser || !isColaborador) && !done && (
                                  <button onClick={() => handleEditOneTimeTask(t)} className="text-slate-400 hover:text-slate-700 bg-slate-50 px-2 py-1 rounded" title="Editar Tarefa">
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                )}

                                <button onClick={() => setExpandedItems((prev) => ({ ...prev, [t.id]: !prev[t.id] }))} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-50 px-2 py-1 rounded">
                                  {itemSubtasks.length > 0 && <span>{completedSubs}/{itemSubtasks.length} itens</span>}
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>

                            {t.description && <p className="mt-1 text-sm text-slate-500">{t.description}</p>}
                            
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1 text-primary/80 font-medium"><Building2 className="h-3.5 w-3.5" /> {t.empresa || "Todas"}</span>
                              {t.setor && <span className="flex items-center gap-1 text-indigo-600 font-medium"><Briefcase className="h-3.5 w-3.5" /> {t.setor}</span>}
                              <span className="flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" /> Resp: {userName(t.assigned_to)}</span>
                              {t.created_by && <span className="flex items-center gap-1 text-amber-700 font-medium"><ArrowUpRight className="h-3.5 w-3.5" /> Enviado por: {userName(t.created_by)}</span>}
                            </div>

                            {requiresAcceptance && !done && (
                              <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <div className="text-xs text-amber-800">
                                  <span className="font-semibold block mb-0.5">Tarefa aguardando aceite</span>
                                  Para iniciar e conseguir concluir os passos, o responsável precisa aceitar a tarefa.
                                </div>
                                {canAccept && (
                                  <button onClick={() => handleAcceptTask(t)} disabled={togglingId === t.id} className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 shadow-sm transition-colors">
                                    {togglingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                                    Aceitar Tarefa
                                  </button>
                                )}
                              </div>
                            )}

                            {isExpanded && (
                              <div className="mt-4 space-y-4 rounded-lg bg-slate-50/50 p-4 border border-slate-100">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Perguntas, Passos e Chat</p>
                                
                                {itemSubtasks.length === 0 ? (
                                  <p className="text-xs text-slate-400">Nenhum item adicionado.</p>
                                ) : (
                                  <ul className="space-y-4">
                                    {itemSubtasks.map((sub) => {
                                      const commentsList = sub.comments || [];
                                      return (
                                        <li key={sub.id} className="rounded-lg bg-white p-3 border border-slate-200 shadow-sm">
                                          <div className="flex items-start justify-between gap-2">
                                            <label className="flex items-start gap-2 cursor-pointer select-none flex-1">
                                              <input 
                                                type="checkbox" 
                                                disabled={!!(requiresAcceptance && !canAccept)} 
                                                checked={sub.completed} 
                                                onChange={() => { if(requiresAcceptance && !canAccept) { toast.info("Responsável precisa aceitar a tarefa primeiro."); return; } handleToggleSubtask(sub); }} 
                                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary mt-0.5 shrink-0 disabled:opacity-50" 
                                              />
                                              <span className={`break-words text-sm font-semibold ${sub.completed ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                                {sub.title}
                                                {sub.assigned_to && (
                                                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-100">
                                                    <UserIcon className="h-3 w-3" /> {userName(sub.assigned_to)}
                                                  </span>
                                                )}
                                              </span>
                                            </label>
                                            <button onClick={() => handleDeleteSubtask(sub)} className="text-slate-400 hover:text-red-600 p-1 bg-slate-50 rounded" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                                          </div>

                                          <div className="mt-3 ml-6 pl-3 border-l-2 border-slate-100 space-y-3">
                                            {commentsList.length > 0 && (
                                              <div className="space-y-2">
                                                {commentsList.map((c) => (
                                                  <div key={c.id} className="rounded-lg bg-slate-50/80 p-2.5 border border-slate-100 text-xs">
                                                    <div className="flex items-center justify-between font-semibold text-slate-700 mb-1">
                                                      <span className="flex items-center gap-1.5 text-primary">
                                                        <UserIcon className="h-3 w-3" /> {userName(c.user_id)}
                                                      </span>
                                                      <span className="text-[10px] text-slate-400 font-normal">
                                                        {new Date(c.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                                                      </span>
                                                    </div>
                                                    
                                                    <p className="text-slate-700 whitespace-pre-wrap pl-4">
                                                      {(() => {
                                                        const names = users.map(u => u.full_name || u.email).filter(Boolean);
                                                        if (names.length === 0) return c.comment;
                                                        
                                                        const regex = new RegExp(`(@(?:${names.join('|')}))`, 'gi');
                                                        
                                                        return c.comment.split(regex).map((part, i) => 
                                                          part.match(regex) ? (
                                                            <span key={i} className="text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded-md">
                                                              {part}
                                                            </span>
                                                          ) : (
                                                            part
                                                          )
                                                        );
                                                      })()}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            <MentionInput
                                              value={commentInputs[sub.id] || ""}
                                              onChange={(val) => setCommentInputs(prev => ({ ...prev, [sub.id]: val }))}
                                              onSubmit={(text, assignedToId) => handleAddComment(sub, text, assignedToId)}
                                              users={users}
                                              placeholder="Responder... (Use @ para marcar alguém)"
                                              isComment={true}
                                            />
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}

                                <div className="mt-4 pt-4 border-t border-slate-200">
                                  <MentionInput
                                    value={newSubtaskTexts[t.id] || ""}
                                    onChange={(val) => setNewSubtaskTexts((prev) => ({ ...prev, [t.id]: val }))}
                                    onSubmit={(text, assignedToId) => handleAddSubtask(t.id, text, assignedToId)}
                                    users={users}
                                    placeholder="Adicionar pergunta ou passo... (Use @ para direcionar)"
                                    buttonLabel="Adicionar Passo"
                                  />
                                </div>
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

      {/* Aba de Relatório para RH */}
      {activeTab === "rh_report" && !isColaborador && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tempo Médio de Aceite</span>
              <p className="mt-2 text-3xl font-bold text-slate-900">{rhReportData.avgAcceptTimeHours} <span className="text-sm font-normal text-slate-500">horas</span></p>
              <p className="mt-1 text-xs text-slate-400">Média de tempo até o responsável aceitar a tarefa.</p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Índice de Não Realizadas</span>
              <p className={`mt-2 text-3xl font-bold ${rhReportData.uncompletedIndex > 30 ? "text-red-600" : "text-amber-600"}`}>{rhReportData.uncompletedIndex}%</p>
              <p className="mt-1 text-xs text-slate-400">{rhReportData.totalNotDone} de {rhReportData.totalAssigned} rotinas e tarefas pendentes.</p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Concluídas</span>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{rhReportData.totalCompleted} <span className="text-sm font-normal text-slate-500">itens</span></p>
              <p className="mt-1 text-xs text-slate-400">Total de entregas (rotinas + tarefas).</p>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Desempenho Individual por Colaborador (Rotinas e Tarefas)</h3>
            <div className="divide-y overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3">Colaborador</th>
                    <th className="p-3">Itens Atribuídos</th>
                    <th className="p-3">Concluídos</th>
                    <th className="p-3">Pendentes / Não Realizados</th>
                    <th className="p-3">Taxa de Conclusão</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.map((r) => {
                    const pctUser = r.total ? Math.round((r.done / r.total) * 100) : 0;
                    return (
                      <tr key={r.id || "team"} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-900 flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-slate-400" /> {userName(r.id)}
                        </td>
                        <td className="p-3">{r.total}</td>
                        <td className="p-3 text-emerald-600 font-semibold">{r.done}</td>
                        <td className="p-3 text-red-600 font-semibold">{r.pending.length}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full ${pctUser === 100 ? "bg-emerald-500" : pctUser >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pctUser}%` }} />
                            </div>
                            <span className="text-xs font-medium">{pctUser}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Reports e Manage */}
      {activeTab === "reports" && !isColaborador && (
        <div className="space-y-4">
          {report.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white py-14 text-center text-sm text-slate-500">
              Nenhum item previsto para os filtros selecionados neste período.
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
                      {row.done}/{row.total} · <strong className={p === 100 ? "text-emerald-600" : p >= 50 ? "text-amber-600" : "text-red-600"}>{p}%</strong>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${p === 100 ? "bg-emerald-500" : p >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${p}%` }} />
                  </div>
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
              {editingTemplateId && <button type="button" onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Field label="Empresa"><select value={newEmpresa} onChange={(e) => setNewEmpresa(e.target.value)} className={inputCls}>{EMPRESAS.map((e) => <option key={e} value={e}>{e}</option>)}</select></Field>
              <Field label="Setor / Depto"><select value={newSetor} onChange={(e) => setNewSetor(e.target.value)} className={inputCls}>{SETORES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            </div>
            <Field label="Título *"><input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required className={inputCls} /></Field>
            <Field label="Descrição"><textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} className={inputCls} /></Field>
            
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria"><select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={inputCls}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
              <Field label="Responsável"><select value={newAssignedTo} onChange={(e) => setNewAssignedTo(e.target.value)} className={inputCls}><option value="">Todos / Equipe</option>{visibleUsers.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}</select></Field>
            </div>
            <Field label="Recorrência">
              <select value={newRecurrenceType} onChange={(e) => setNewRecurrenceType(e.target.value as RecurrenceType)} className={inputCls}>
                {(Object.keys(RECURRENCE_LABEL) as RecurrenceType[]).map((r) => <option key={r} value={r}>{RECURRENCE_LABEL[r]}</option>)}
              </select>
            </Field>

            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <span className="text-sm font-medium text-slate-700">Subtarefas Padrão</span>
              {formSubtasks.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {formSubtasks.map((st, idx) => (
                    <li key={idx} className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 text-xs border">
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{st.title}</span>
                        {st.assigned_to && <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 shrink-0"><UserIcon className="h-3 w-3" /> {userName(st.assigned_to)}</span>}
                      </div>
                      <button type="button" onClick={() => setFormSubtasks((prev) => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 ml-2 shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
              <MentionInput
                 value={formSubtaskInput}
                 onChange={setFormSubtaskInput}
                 onSubmit={(text, assignedToId) => {
                   setFormSubtasks(prev => [...prev, { title: text, assigned_to: assignedToId }]);
                   setFormSubtaskInput("");
                 }}
                 users={visibleUsers}
                 placeholder="Ex: Verificar portas (Use @...)"
              />
            </div>
            <button type="submit" disabled={savingTemplate} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">
              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : editingTemplateId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingTemplateId ? "Salvar alterações" : "Adicionar rotina"}
            </button>
          </form>

          <div className="overflow-hidden rounded-xl border bg-white">
            <header className="flex justify-between items-center border-b bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
              <span>Rotinas cadastradas ({manageList.length})</span>
            </header>
            <ul className="divide-y max-h-[700px] overflow-y-auto">
              {manageList.map((t) => (
                <li key={t.id} className={`flex items-start gap-3 px-4 py-3 ${editingTemplateId === t.id ? "bg-primary/5" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{t.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{t.category} · {recurrenceText(t)} · {userName(t.assigned_to)}</p>
                  </div>
                  <button onClick={() => handleStartEdit(t)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeletingTemplate(t)} className="rounded p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Modal Concluir Tarefa que exige Foto/Valor */}
      {completingTemplate && (
        <Modal title={`Concluir: ${completingTemplate.title}`} onClose={() => !uploading && setCompletingTemplate(null)}>
          <form onSubmit={handleConfirmModalSubmit} className="space-y-4">
            {completingTemplate.requires_input && <Field label={`${completingTemplate.input_label || "Valor"} *`}><input value={inputValue} onChange={(e) => setInputValue(e.target.value)} autoFocus className={inputCls} /></Field>}
            {completingTemplate.requires_photo && <Field label="Foto *"><input type="file" accept="image/*" capture="environment" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm" /></Field>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCompletingTemplate(null)} disabled={uploading} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={uploading} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Concluir
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Nova Tarefa Extra (ou Edição) com Proteção contra Duplo Clique */}
      {showOneTimeModal && (
        <Modal title={editingOneTimeId ? "Editar Tarefa" : "Nova Tarefa / Pedido de Aprovação"} onClose={() => !isSavingTask && setShowOneTimeModal(false)}>
          <form onSubmit={handleSaveOneTimeTask} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Empresa"><select value={oneTimeEmpresa} onChange={(e) => setOneTimeEmpresa(e.target.value)} className={inputCls}>{EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}</select></Field>
              <Field label="Setor / Depto"><select value={oneTimeSetor} onChange={(e) => setOneTimeSetor(e.target.value)} className={inputCls}>{SETORES.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
            </div>
            <Field label="Título *"><input value={oneTimeTitle} onChange={(e) => setOneTimeTitle(e.target.value)} required autoFocus className={inputCls} placeholder="Ex: Orçamento confraternização" /></Field>
            <Field label="Descrição / Detalhes"><textarea value={oneTimeDesc} onChange={(e) => setOneTimeDesc(e.target.value)} rows={2} className={inputCls} placeholder="Descreva os valores..." /></Field>
            
            <div className={`grid gap-3 ${isColaborador ? "" : "grid-cols-2"}`}>
              <Field label="Categoria"><select value={oneTimeCategory} onChange={(e) => setOneTimeCategory(e.target.value)} className={inputCls}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
              {!isColaborador && (
                <Field label="Responsável">
                  <select value={oneTimeAssignedTo} onChange={(e) => setOneTimeAssignedTo(e.target.value)} className={inputCls}>
                    <option value="">Equipe (Sem dono)</option>
                    {visibleUsers.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                  </select>
                </Field>
              )}
            </div>

            <Field label="Prazo (Data de Execução)">
               <input type="date" value={oneTimeDueDate} onChange={(e) => setOneTimeDueDate(e.target.value)} className={inputCls} />
            </Field>

            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <span className="text-sm font-medium text-slate-700">Perguntas ou Passos</span>
              {oneTimeFormSubtasks.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {oneTimeFormSubtasks.map((st, idx) => (
                    <li key={idx} className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 text-xs border">
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{st.title}</span>
                        {st.assigned_to && <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 shrink-0"><UserIcon className="h-3 w-3" /> {userName(st.assigned_to)}</span>}
                      </div>
                      {!editingOneTimeId && (
                        <button type="button" onClick={() => setOneTimeFormSubtasks((prev) => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 ml-2 shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!editingOneTimeId && (
                <MentionInput
                   value={oneTimeSubInput}
                   onChange={setOneTimeSubInput}
                   onSubmit={(text, assignedToId) => {
                     setOneTimeFormSubtasks(prev => [...prev, { title: text, assigned_to: assignedToId }]);
                     setOneTimeSubInput("");
                   }}
                   users={visibleUsers}
                   placeholder="Escreva e use @ para direcionar..."
                />
              )}
              {editingOneTimeId && <p className="text-xs text-slate-500 italic">Adicione passos diretamente na lista de tarefas.</p>}
            </div>
            
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowOneTimeModal(false)} disabled={isSavingTask} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={isSavingTask} className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60">
                {isSavingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : editingOneTimeId ? <Pencil className="h-4 w-4" /> : <Zap className="h-4 w-4" />} 
                {editingOneTimeId ? "Salvar Tarefa" : "Criar tarefa"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog open={!!deletingTemplate} onOpenChange={(o) => !o && setDeletingTemplate(null)} title="Excluir rotina?" description={`"${deletingTemplate?.title ?? ""}" e todo o histórico serão removidos.`} confirmLabel="Excluir" onConfirm={handleDeleteTemplate} />
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">{label}</span>{children}</label>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button></div>
        {children}
      </div>
    </div>
  );
}