"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
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
  assigned_to: string | null;
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

interface Subtask {
  id: string;
  checklist_item_id: string;
  title: string;
  completed: boolean;
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
  "Serra Carioca",
  "Feitoria Cozinha",
  "Casa Cônego",
  "Savá Padaria",
  "Rua Burguer",
  "Feito Brasa",
  "Produção Central",
  "Distribuidora",
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

  const [oneTimeDoneBefore, setOneTimeDoneBefore] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState(todayLocal());
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterEmpresa, setFilterEmpresa] = useState<string>("all");
  
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [completingTemplate, setCompletingTemplate] = useState<Template | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [showOneTimeModal, setShowOneTimeModal] = useState(false);
  const [oneTimeTitle, setOneTimeTitle] = useState("");
  const [oneTimeDesc, setOneTimeDesc] = useState("");
  const [oneTimeCategory, setOneTimeCategory] = useState("Urgente");
  const [oneTimeAssignedTo, setOneTimeAssignedTo] = useState("");
  const [oneTimeEmpresa, setOneTimeEmpresa] = useState("");

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Geral");
  const [newEmpresa, setNewEmpresa] = useState<string>("");
  const [newAssignedTo, setNewAssignedTo] = useState<string>("");
  const [newRecurrenceType, setNewRecurrenceType] = useState<RecurrenceType>("daily");
  const [newRecurrenceDay, setNewRecurrenceDay] = useState<number>(1);
  const [newCustomDays, setNewCustomDays] = useState<number[]>([]);
  const [newRequiresInput, setNewRequiresInput] = useState(false);
  const [newInputLabel, setNewInputLabel] = useState("");
  const [newRequiresPhoto, setNewRequiresPhoto] = useState(false);
  
  const [formSubtasks, setFormSubtasks] = useState<string[]>([]);
  const [formSubtaskInput, setFormSubtaskInput] = useState("");

  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);

  const isColaborador = (currentUserProfile?.role ?? "member") === "member";

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedDate]);

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
        if (myProfile.role === "member") {
          setFilterUser(myProfile.id);
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

  async function fetchSubtasks(templateIds: string[]) {
    if (!templateIds.length) return;
    const { data, error } = await supabase
      .from("checklist_subtasks")
      .select("*")
      .in("checklist_item_id", templateIds);

    if (!error && data) {
      const map: Record<string, Subtask[]> = {};
      data.forEach((s: Subtask) => {
        if (!map[s.checklist_item_id]) map[s.checklist_item_id] = [];
        map[s.checklist_item_id].push(s);
      });
      setSubtasks(map);
    }
  }

  async function fetchLogs() {
    const { data: lgData, error } = await supabase
      .from("daily_checklist_logs")
      .select("*")
      .lte("date", selectedDate)
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
        if (l.completed && l.date < selectedDate) doneBefore.add(l.template_id);
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
          s.id === subtask.id ? data : s
        ),
      }));
    }
  }

  async function handleAddSubtask(templateId: string, e: React.FormEvent) {
    e.preventDefault();
    const text = newSubtaskTexts[templateId]?.trim();
    if (!text) return;

    const { data, error } = await supabase
      .from("checklist_subtasks")
      .insert({ checklist_item_id: templateId, title: text, completed: false })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao adicionar subtarefa");
      return;
    }

    if (data) {
      setSubtasks((prev) => ({
        ...prev,
        [templateId]: [...(prev[templateId] || []), data],
      }));
      setNewSubtaskTexts((prev) => ({ ...prev, [templateId]: "" }));
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
    const isCompleted = !!currentLog?.completed && currentLog.date === selectedDate;

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

    const result =
      currentLog && currentLog.date === selectedDate
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
              date: selectedDate,
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
    if (!oneTimeEmpresa) return void toast.error("Selecione a empresa para a tarefa extra.");

    const targetUser = isColaborador ? currentUser : oneTimeAssignedTo || null;

    const { data, error } = await supabase
      .from("daily_checklist_templates")
      .insert({
        title: oneTimeTitle,
        description: oneTimeDesc,
        category: oneTimeCategory,
        empresa: oneTimeEmpresa,
        assigned_to: targetUser,
        created_by: currentUser,
        recurrence_type: "daily",
        is_one_time: true,
      })
      .select()
      .single();

    if (error) return void toast.error("Não foi possível criar a tarefa", { description: error.message });
    if (data) {
      setTemplates((prev) => [...prev, data]);
      setOneTimeTitle("");
      setOneTimeDesc("");
      setOneTimeAssignedTo("");
      setShowOneTimeModal(false);
      toast.success("Tarefa extra criada.");
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
    setNewEmpresa(template.empresa || "");
    setNewAssignedTo(template.assigned_to || "");
    setNewRecurrenceType(template.recurrence_type || "daily");
    setNewRecurrenceDay(template.recurrence_day || 1);
    setNewCustomDays(template.custom_days || []);
    setNewRequiresInput(template.requires_input || false);
    setNewInputLabel(template.input_label || "");
    setNewRequiresPhoto(template.requires_photo || false);
    
    const currentSubs = subtasks[template.id] || [];
    setFormSubtasks(currentSubs.map((s) => s.title));
    setFormSubtaskInput("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingTemplateId(null);
    setNewTitle("");
    setNewDesc("");
    setNewCategory("Geral");
    setNewEmpresa("");
    setNewAssignedTo("");
    setNewRecurrenceType("daily");
    setNewRecurrenceDay(1);
    setNewCustomDays([]);
    setNewRequiresInput(false);
    setNewInputLabel("");
    setNewRequiresPhoto(false);
    setFormSubtasks([]);
    setFormSubtaskInput("");
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (!newEmpresa) return void toast.error("Por favor, selecione a empresa vinculada.");
    if (newRecurrenceType === "custom" && newCustomDays.length === 0) {
      return void toast.error("Selecione ao menos um dia da semana.");
    }

    const payload = {
      title: newTitle,
      description: newDesc,
      category: newCategory,
      empresa: newEmpresa,
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
      const subtaskInserts = formSubtasks.map((stTitle) => ({
        checklist_item_id: saved.id,
        title: stTitle,
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

  const dueToday = useMemo(
    () =>
      templates.filter((t) => {
        if (t.created_at && toLocalDateString(t.created_at) > selectedDate) return false;
        if (t.is_one_time) return !oneTimeDoneBefore.has(t.id);
        return isDueOn(t, selectedDate);
      }),
    [templates, selectedDate, oneTimeDoneBefore],
  );

  const visibleToday = useMemo(() => {
    return dueToday.filter((t) => {
      const matchesUser = filterUser === "all" || t.assigned_to === filterUser || (isColaborador && !t.assigned_to);
      const matchesEmpresa = filterEmpresa === "all" || t.empresa === filterEmpresa;

      let hasAccessToEmpresa = true;
      if (isColaborador && currentUserProfile?.empresas && currentUserProfile.empresas.length > 0) {
        hasAccessToEmpresa = t.empresa ? currentUserProfile.empresas.includes(t.empresa) : true;
      }

      return matchesUser && matchesEmpresa && hasAccessToEmpresa;
    });
  }, [dueToday, filterUser, filterEmpresa, isColaborador, currentUserProfile]);

  const isDone = (t: Template) => {
    const l = logs[t.id];
    return !!l && l.completed && l.date === selectedDate;
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    visibleToday.forEach((t) => {
      const key = t.is_one_time ? "⚡ Tarefas extras" : t.category || "Geral";
      map.set(key, [...(map.get(key) ?? []), t]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => (a.startsWith("⚡") ? -1 : b.startsWith("⚡") ? 1 : a.localeCompare(b)));
  }, [visibleToday]);

  const doneCount = visibleToday.filter(isDone).length;
  const pct = visibleToday.length ? Math.round((doneCount / visibleToday.length) * 100) : 0;

  const report = useMemo(() => {
    const rows = new Map<string, { id: string | null; total: number; done: number; pending: Template[] }>();
    visibleToday.forEach((t) => {
      const key = t.assigned_to ?? "__team";
      const row = rows.get(key) ?? { id: t.assigned_to, total: 0, done: 0, pending: [] };
      row.total += 1;
      if (isDone(t)) row.done += 1;
      else row.pending.push(t);
      rows.set(key, row);
    });
    return Array.from(rows.values()).sort((a, b) => b.total - a.total);
  }, [visibleToday, logs, selectedDate]);

  const manageList = useMemo(() => {
    let filtered = templates.filter((t) => !t.is_one_time);
    if (filterEmpresa !== "all") {
       filtered = filtered.filter(t => t.empresa === filterEmpresa);
    }
    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  }, [templates, filterEmpresa]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "daily" as const, label: "Checklist do Dia", icon: CheckSquare },
    ...(!isColaborador
      ? [
          { id: "reports" as const, label: "Acompanhamento", icon: Users },
          { id: "manage" as const, label: "Gerenciar Rotinas", icon: Repeat },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Checklist Diário</h1>
          <p className="mt-1 text-sm text-slate-500">Rotinas operacionais, subtarefas e tarefas extras da equipe.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          
          <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
            <Building2 className="h-4 w-4 text-slate-500" />
            <select 
              value={filterEmpresa} 
              onChange={(e) => setFilterEmpresa(e.target.value)} 
              className="bg-transparent outline-none max-w-[120px] truncate"
            >
              <option value="all">Todas as Empresas</option>
              {isColaborador && currentUserProfile?.empresas 
                 ? currentUserProfile.empresas.map(e => <option key={e} value={e}>{e}</option>)
                 : EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)
              }
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent outline-none"
            />
          </label>

          {!isColaborador && (
            <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
              <Filter className="h-4 w-4 text-slate-500" />
              <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="bg-transparent outline-none max-w-[120px] truncate">
                <option value="all">Todos os usuários</option>
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
                {doneCount} de {visibleToday.length} concluídas
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

          {visibleToday.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed bg-white py-14 text-center">
              <FolderCheck className="mb-3 h-8 w-8 text-slate-400" />
              <p className="font-medium text-slate-700">Nenhuma tarefa encontrada</p>
              <p className="mt-1 text-sm text-slate-500">
                {isColaborador ? "Verifique o filtro de empresa ou aproveite o dia! 🎉" : "Cadastre rotinas na aba \"Gerenciar Rotinas\"."}
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
                                <Building2 className="h-3.5 w-3.5" /> {t.empresa || "Geral"}
                              </span>
                              <span className="flex items-center gap-1">
                                <UserIcon className="h-3.5 w-3.5" /> {userName(t.assigned_to)}
                              </span>
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
                              <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                                <p className="text-xs font-semibold text-slate-600">Subtarefas / Passos:</p>
                                {itemSubtasks.length === 0 ? (
                                  <p className="text-xs text-slate-400">Nenhuma subtarefa adicionada.</p>
                                ) : (
                                  <ul className="space-y-1.5">
                                    {itemSubtasks.map((sub) => (
                                      <li key={sub.id} className="flex items-center justify-between gap-2 text-sm">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={sub.completed}
                                            onChange={() => handleToggleSubtask(sub)}
                                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                          />
                                          <span className={sub.completed ? "text-slate-400 line-through" : "text-slate-700"}>
                                            {sub.title}
                                          </span>
                                        </label>
                                        <button
                                          onClick={() => handleDeleteSubtask(sub)}
                                          className="text-slate-400 hover:text-red-600"
                                          title="Excluir subtarefa"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                <form onSubmit={(e) => handleAddSubtask(t.id, e)} className="mt-2 flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Adicionar nova subtarefa..."
                                    value={newSubtaskTexts[t.id] || ""}
                                    onChange={(e) =>
                                      setNewSubtaskTexts((prev) => ({ ...prev, [t.id]: e.target.value }))
                                    }
                                    className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs outline-none focus:border-primary"
                                  />
                                  <button
                                    type="submit"
                                    className="rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90"
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
              Nenhuma rotina prevista para a empresa selecionada nesta data.
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
                          <li key={t.id}>{t.title} <span className="text-xs opacity-60">({t.empresa})</span></li>
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

            <Field label="Empresa *">
              <select value={newEmpresa} onChange={(e) => setNewEmpresa(e.target.value)} required className={inputCls}>
                <option value="">Selecione a Empresa</option>
                {EMPRESAS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </Field>

            <Field label="Título *">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required className={inputCls} />
            </Field>
            <Field label="Descrição">
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} className={inputCls} />
            </Field>
            
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria">
                <input list="checklist-categories" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={inputCls} />
                <datalist id="checklist-categories">
                  {CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
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
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Verificar temperatura"
                  value={formSubtaskInput}
                  onChange={(e) => setFormSubtaskInput(e.target.value)}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (formSubtaskInput.trim()) {
                      setFormSubtasks((prev) => [...prev, formSubtaskInput.trim()]);
                      setFormSubtaskInput("");
                    }
                  }}
                  className="rounded bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
                >
                  Adicionar
                </button>
              </div>
              {formSubtasks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {formSubtasks.map((st, idx) => (
                    <li key={idx} className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 text-xs border">
                      <span>{st}</span>
                      <button
                        type="button"
                        onClick={() => setFormSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700"
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
              <p className="py-10 text-center text-sm text-slate-500">Nenhuma rotina cadastrada para esta empresa.</p>
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
                         {t.empresa}
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
        <Modal title="Nova tarefa extra" onClose={() => setShowOneTimeModal(false)}>
          <form onSubmit={handleCreateOneTimeTask} className="space-y-4">
            <p className="text-sm text-slate-500">
              Aparece no checklist até ser concluída (não se repete).
            </p>
            
            <Field label="Empresa *">
              <select value={oneTimeEmpresa} onChange={(e) => setOneTimeEmpresa(e.target.value)} required className={inputCls}>
                <option value="">Selecione a Empresa</option>
                {isColaborador && currentUserProfile?.empresas 
                   ? currentUserProfile.empresas.map(e => <option key={e} value={e}>{e}</option>)
                   : EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)
                }
              </select>
            </Field>

            <Field label="Título *">
              <input value={oneTimeTitle} onChange={(e) => setOneTimeTitle(e.target.value)} required autoFocus className={inputCls} />
            </Field>
            
            <Field label="Descrição">
              <textarea value={oneTimeDesc} onChange={(e) => setOneTimeDesc(e.target.value)} rows={2} className={inputCls} />
            </Field>
            
            <div className={`grid gap-3 ${isColaborador ? "" : "grid-cols-2"}`}>
              <Field label="Categoria">
                <input list="checklist-categories-extra" value={oneTimeCategory} onChange={(e) => setOneTimeCategory(e.target.value)} className={inputCls} />
                <datalist id="checklist-categories-extra">
                  {CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              {!isColaborador && (
                <Field label="Responsável">
                  <select value={oneTimeAssignedTo} onChange={(e) => setOneTimeAssignedTo(e.target.value)} className={inputCls}>
                    <option value="">Todos / Equipe</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowOneTimeModal(false)} className="rounded-lg border px-4 py-2 text-sm">
                Cancelar
              </button>
              <button type="submit" className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                <Zap className="h-4 w-4" /> Criar tarefa
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
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
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