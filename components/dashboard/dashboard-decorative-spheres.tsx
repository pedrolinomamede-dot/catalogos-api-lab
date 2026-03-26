export function DecorativeSpheres() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden md:block">
      {/* Top left sphere — caustic shadow */}
      <div className="absolute top-[10%] left-[15%] w-32 h-32 rounded-full bg-gradient-to-br from-white to-transparent opacity-60 blur-sm shadow-[inset_0_0_20px_rgba(255,255,255,1),0px_8px_20px_rgba(0,0,0,0.05)]" />
      {/* Bottom right purple glow — colored shadow */}
      <div className="absolute bottom-[10%] right-[20%] w-64 h-64 rounded-full bg-gradient-to-tr from-[#9b8bf4]/20 to-transparent blur-3xl shadow-[5px_10px_20px_rgba(120,80,200,0.20)]" />
      {/* Top right small sphere — caustic shadow */}
      <div className="absolute top-[20%] right-[10%] w-16 h-16 rounded-full bg-gradient-to-br from-white to-transparent opacity-80 shadow-[inset_0_0_10px_rgba(255,255,255,1),0px_8px_20px_rgba(0,0,0,0.05)]" />
    </div>
  );
}
