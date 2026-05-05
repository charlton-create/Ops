interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  gradient?: string;
  children?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  icon,
  gradient = "from-purple-600 to-pink-500",
  children,
}: HeaderProps) {
  return (
    <div className={`bg-gradient-to-r ${gradient} px-6 py-5 rounded-xl mb-6 relative overflow-hidden`}>
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            {icon && <span className="text-2xl">{icon}</span>}
            <h1 className="text-2xl font-bold text-white">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-white/70 text-sm mt-1">{subtitle}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
