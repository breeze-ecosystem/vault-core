interface BlogAuthorProps {
  name: string;
  role?: string;
  avatar?: string;
}

export function BlogAuthor({ name, role }: BlogAuthorProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {initials}
      </div>

      {/* Name + Role */}
      <div>
        <p className="text-sm font-semibold text-foreground">{name}</p>
        {role && (
          <p className="text-xs text-muted">{role}</p>
        )}
      </div>
    </div>
  );
}
