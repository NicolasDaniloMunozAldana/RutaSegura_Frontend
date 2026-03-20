export default function EstudiantesPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestión de Estudiantes</h1>
            <p className="text-slate-600 text-sm mt-1">0 estudiantes registrados</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md active:scale-95 transition-all flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Registrar Estudiante
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <svg
              width="18"
              height="18"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o ID..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
            />
          </div>
          <select className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all">
            <option>Todas las Rutas</option>
          </select>
          <select className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all">
            <option>Todos los estados</option>
          </select>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-slate-300 mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Sin estudiantes</h3>
            <p className="text-slate-600 text-sm">
              Aún no hay estudiantes registrados. Comienza agregando uno nuevo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
