"use client";

import { useEffect, useState } from "react";
import { BookOpen, FileText, Loader2, Plus, Trash2, X, PlayCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface IT {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  target_role: string;
  empresa: string | null;
  file_url: string | null;
}

const FUNCOES = ["Todos", "Atendimento", "Cozinha", "Bar", "Limpeza", "Gerência", "Administrativo"];
const EMPRESAS = ["Todas", "Serra Carioca", "Feitoria Cozinha", "Casa Cônego", "Savá Padaria", "Rua Burguer", "Feito Brasa"];

export default function WorkInstructionsPage() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [instructions, setInstructions] = useState<IT[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState("Todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newRole, setNewRole] = useState("Todos");
  const [newEmpresa, setNewEmpresa] = useState("Todas");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    
    if (userData?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
        
      if (profile) {
        setIsAdmin(profile.role !== "member");
      }
    }

    const { data: its } = await supabase
      .from("work_instructions")
      .select("*")
      .order("created_at", { ascending: false });

    if (its) setInstructions(its);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle) return toast.error("Preencha o título.");
    if (!newContent && !file && !newVideoUrl) {
      return toast.error("Forneça um passo a passo escrito, um link de vídeo ou anexe um arquivo.");
    }

    setUploading(true);
    let finalFileUrl = null;
    
    if (file) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("it-files")
        .upload(fileName, file);

      if (uploadError) {
        setUploading(false);
        return toast.error("Erro ao enviar arquivo anexado.");
      }

      const { data: publicUrlData } = supabase.storage
        .from("it-files")
        .getPublicUrl(fileName);
        
      finalFileUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("work_instructions")
      .insert({
        title: newTitle,
        description: newDesc || null,
        content: newContent || null,
        video_url: newVideoUrl || null,
        target_role: newRole,
        empresa: newEmpresa === "Todas" ? null : newEmpresa,
        file_url: finalFileUrl
      })
      .select()
      .single();

    setUploading(false);

    if (error) return toast.error("Erro ao guardar instrução.");
    
    setInstructions([data, ...instructions]);
    setShowModal(false);
    toast.success("Instrução de trabalho adicionada!");
    
    setNewTitle(""); setNewDesc(""); setNewContent(""); setNewVideoUrl(""); 
    setFile(null); setNewRole("Todos"); setNewEmpresa("Todas");
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta instrução?")) return;
    const { error } = await supabase.from("work_instructions").delete().eq("id", id);
    if (!error) {
      setInstructions(instructions.filter(it => it.id !== id));
      toast.success("Excluída com sucesso.");
    }
  }

  const visibleInstructions = isAdmin 
    ? instructions 
    : instructions.filter(it => it.target_role === "Todos" || it.target_role === userRole);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Instruções de Trabalho (IT)</h1>
          <p className="text-sm text-slate-500">Manuais, processos e procedimentos da equipa.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Nova Instrução
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleInstructions.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed py-12 text-center text-slate-500">
            Nenhuma instrução de trabalho encontrada para a sua função.
          </div>
        ) : (
          visibleInstructions.map((it) => (
            <div key={it.id} className="flex flex-col rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(it.id)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{it.title}</h3>
                {it.description && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{it.description}</p>}
                
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {it.target_role}
                  </span>
                  {it.empresa && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {it.empresa}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="border-t bg-slate-50">
                {it.content && (
                  <button 
                    onClick={() => setExpandedId(expandedId === it.id ? null : it.id)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Ler Passo a Passo
                    {expandedId === it.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
                
                {expandedId === it.id && it.content && (
                  <div className="px-5 pb-4 text-sm text-slate-600 whitespace-pre-wrap border-t border-slate-100 pt-3">
                    {it.content}
                  </div>
                )}

                <div className="flex divide-x border-t">
                  {it.video_url && (
                    <a
                      href={it.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-primary transition-colors"
                    >
                      <PlayCircle className="h-4 w-4" /> Vídeo
                    </a>
                  )}
                  {it.file_url && (
                    <a
                      href={it.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-primary transition-colors"
                    >
                      <FileText className="h-4 w-4" /> Anexo
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl my-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nova Instrução</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Título *</span>
                <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Abertura de comanda CPLUG" className="w-full rounded-lg border p-2 text-sm outline-none focus:border-primary" />
              </label>
              
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Resumo / Descrição Curta</span>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full rounded-lg border p-2 text-sm outline-none focus:border-primary" />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Passo a Passo Escrito</span>
                <textarea 
                  value={newContent} 
                  onChange={e => setNewContent(e.target.value)} 
                  rows={5} 
                  placeholder="1. Ligue o sistema...&#10;2. Insira a senha...&#10;3. Clique em..."
                  className="w-full rounded-lg border p-2 text-sm outline-none focus:border-primary" 
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Função Alvo</span>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full rounded-lg border p-2 text-sm outline-none focus:border-primary">
                    {FUNCOES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Empresa</span>
                  <select value={newEmpresa} onChange={e => setNewEmpresa(e.target.value)} className="w-full rounded-lg border p-2 text-sm outline-none focus:border-primary">
                    {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </label>
              </div>

              <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Complementos (Opcionais)</p>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Link de Vídeo (YouTube, Drive, etc)</span>
                  <input type="text" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border p-2 text-sm outline-none focus:border-primary" />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Arquivo / Imagem de Apoio</span>
                  <input type="file" accept=".pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-medium" />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button type="submit" disabled={uploading} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}