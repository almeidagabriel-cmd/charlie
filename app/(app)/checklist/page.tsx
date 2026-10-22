'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { CheckCircle2, Circle, Plus, Trash2, Calendar, FileText, CheckSquare } from 'lucide-react'

interface Template {
  id: string
  title: string
  description: string | null
  category: string
}

interface Log {
  id: string
  template_id: string
  completed: boolean
  completed_at: string | null
  date: string
}

export default function ChecklistPage() {
  const supabase = createClientComponentClient()
  const [activeTab, setActiveTab] = useState<'daily' | 'reports' | 'manage'>('daily')
  const [templates, setTemplates] = useState<Template[]>([])
  const [logs, setLogs] = useState<Record<string, Log>>({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Form para novo template
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCategory, setNewCategory] = useState('Geral')

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  async function fetchData() {
    setLoading(true)
    
    // Buscar modelos
    const { data: tmpls } = await supabase
      .from('daily_checklist_templates')
      .select('*')
      .order('created_at', { ascending: true })

    if (tmpls) setTemplates(tmpls)

    // Buscar logs da data selecionada
    const { data: lgData } = await supabase
      .from('daily_checklist_logs')
      .select('*')
      .eq('date', selectedDate)

    if (lgData) {
      const logMap: Record<string, Log> = {}
      lgData.forEach((l) => {
        logMap[l.template_id] = l
      })
      setLogs(logMap)
    }

    setLoading(false)
  }

  async function toggleCheck(templateId: string) {
    const currentLog = logs[templateId]
    const isCompleted = !currentLog?.completed

    const { data: user } = await supabase.auth.getUser()

    if (currentLog) {
      // Atualizar log existente
      const { data, error } = await supabase
        .from('daily_checklist_logs')
        .update({
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          completed_by: user.user?.id
        })
        .eq('id', currentLog.id)
        .select()
        .single()

      if (!error && data) {
        setLogs((prev) => ({ ...prev, [templateId]: data }))
      }
    } else {
      // Criar novo log
      const { data, error } = await supabase
        .from('daily_checklist_logs')
        .insert({
          template_id: templateId,
          completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user.user?.id,
          date: selectedDate
        })
        .select()
        .single()

      if (!error && data) {
        setLogs((prev) => ({ ...prev, [templateId]: data }))
      }
    }
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    const { data, error } = await supabase
      .from('daily_checklist_templates')
      .insert({
        title: newTitle,
        description: newDesc,
        category: newCategory
      })
      .select()
      .single()

    if (!error && data) {
      setTemplates((prev) => [...prev, data])
      setNewTitle('')
      setNewDesc('')
    }
  }

  async function handleDeleteTemplate(id: string) {
    const { error } = await supabase
      .from('daily_checklist_templates')
      .delete()
      .eq('id', id)

    if (!error) {
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    }
  }

  const completedCount = templates.filter((t) => logs[t.id]?.completed).length
  const totalCount = templates.length
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checklist Diário</h1>
          <p className="text-sm text-gray-500">Acompanhe e gira as rotinas operacionais diárias.</p>
        </div>

        {/* Seleção de Abas */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'daily' ? 'bg-white shadow text-black' : 'text-gray-600 hover:text-black'
            }`}
          >
            <CheckSquare className="w-4 h-4 inline mr-1.5" />
            Hoje
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'reports' ? 'bg-white shadow text-black' : 'text-gray-600 hover:text-black'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1.5" />
            Relatório
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'manage' ? 'bg-white shadow text-black' : 'text-gray-600 hover:text-black'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-1.5" />
            Gerir Rotinas
          </button>
        </div>
      </div>

      {/* ABA 1: CHECKLIST DO DIA */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 border rounded-xl shadow-sm gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm font-medium"
              />
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="text-right">
                <span className="text-xs text-gray-500 block">Progresso</span>
                <span className="text-sm font-bold">{completedCount} de {totalCount} ({percentage}%)</span>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">A carregar checklist...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl">
              <p className="text-gray-500">Nenhuma rotina cadastrada.</p>
              <button
                onClick={() => setActiveTab('manage')}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Adicionar a primeira rotina
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((template) => {
                const isChecked = !!logs[template.id]?.completed
                return (
                  <div
                    key={template.id}
                    onClick={() => toggleCheck(template.id)}
                    className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-white hover:border-gray-300'
                    }`}
                  >
                    <button className="mt-0.5 text-emerald-600">
                      {isChecked ? (
                        <CheckCircle2 className="w-6 h-6 fill-emerald-500 text-white" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className={`font-semibold text-sm ${isChecked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {template.title}
                        </h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {template.category}
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: RELATÓRIO DE EXECUÇÃO */}
      {activeTab === 'reports' && (
        <div className="bg-white p-6 border rounded-xl space-y-4">
          <h2 className="text-lg font-bold">Relatório do Dia ({selectedDate})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-gray-50">
              <span className="text-xs text-gray-500">Total de Tarefas</span>
              <p className="text-2xl font-bold mt-1">{totalCount}</p>
            </div>
            <div className="p-4 border rounded-lg bg-emerald-50 border-emerald-100">
              <span className="text-xs text-emerald-700">Concluídas</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{completedCount}</p>
            </div>
            <div className="p-4 border rounded-lg bg-amber-50 border-amber-100">
              <span className="text-xs text-amber-700">Pendentes</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">{totalCount - completedCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: GERIR ROTINAS */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateTemplate} className="bg-white p-6 border rounded-xl space-y-4">
            <h2 className="text-lg font-bold">Nova Rotina Recorrente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título da Tarefa</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conferir caixa final do dia"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Financeiro, Abertura, Operacional"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descrição / Instruções (Opcional)</label>
              <textarea
                placeholder="Ex: Detalhes ou orientações de como executar a tarefa..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm h-20"
              />
            </div>
            <button
              type="submit"
              className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
            >
              Guardar Rotina
            </button>
          </form>

          <div className="bg-white p-6 border rounded-xl space-y-4">
            <h2 className="text-lg font-bold">Rotinas Cadastradas</h2>
            <div className="divide-y">
              {templates.map((template) => (
                <div key={template.id} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-sm">{template.title}</span>
                    <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {template.category}
                    </span>
                    {template.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}