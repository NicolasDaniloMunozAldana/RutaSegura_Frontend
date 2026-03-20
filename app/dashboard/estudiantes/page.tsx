export default function EstudiantesPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Gestión de Estudiantes</h3>
          <p className="text-sm text-slate-500 mt-0.5">0 estudiantes registrados</p>
        </div>
        <button className="bg-[#0F2B4B] hover:bg-[#163a63] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Registrar Estudiante
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
          />
        </div>
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20">
          <option>Todas las Rutas</option>
        </select>
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20">
          <option>Todos los estados</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Ruta</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">
                Aún no hay estudiantes registrados.
              </td>
            </tr>
          </tbody>
        </table>
        <div className="px-5 py-3 bg-white border-t border-slate-100 text-xs text-slate-500 font-medium">
          Mostrando 0 de 0 estudiantes
        </div>
      </div>
    </div>
  );
}
