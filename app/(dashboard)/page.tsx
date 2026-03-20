export default function Dashboard() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Panel de Control</h1>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-md">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                </svg>
              </div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Estudiantes</p>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">0</h3>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-md">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                </svg>
              </div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Conductores</p>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">0</h3>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 text-slate-600 rounded-md">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 18c-1 1-1 2-1 2s1 0 2-1m10 0c1 1 1 2 1 2s-1 0-2-1M5 11c-1 0-2 .5-2 1.5V16c0 .5 1 1 2 1h14c1 0 2-.5 2-1v-3.5c0-1-1-1.5-2-1.5M9 11l1-5h4l1 5M6 16h12v3H6z" />
                </svg>
              </div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Vehículos</p>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">0</h3>
          </div>

          <div className="bg-red-50/30 p-6 rounded-xl border border-red-100 border-l-4 border-l-red-500 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 text-red-600 rounded-md">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4v2m-8.485-13.929l11.071 11.071M3.515 3.515L14.586 14.586" />
                </svg>
              </div>
              <p className="text-red-700/70 text-xs font-semibold uppercase tracking-wider">Alertas</p>
            </div>
            <h3 className="text-2xl font-bold text-red-600">0</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-600">Contenido por implementar</p>
        </div>
      </div>
    </div>
  );
}
