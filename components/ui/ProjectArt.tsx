import type { Project } from "@/lib/data";

/**
 * Faux browser window for a project. Shows a real screenshot when
 * `project.image` is set; otherwise a typographic plate — the project's name
 * set large over its own tinted light. Expects a `.group` ancestor for hover.
 */
export default function ProjectArt({ project, tall = false }: { project: Project; tall?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-hairline bg-void ${
        tall ? "h-52 sm:h-64" : "h-44"
      }`}
    >
      <div className="relative z-10 flex items-center gap-1.5 border-b border-hairline bg-panel/70 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-hairline" />
        <span className="h-2 w-2 rounded-full bg-hairline" />
        <span className="h-2 w-2 rounded-full bg-hairline" />
        <span className="ml-2 truncate font-mono text-[0.62rem] text-faint">{project.domain}</span>
      </div>

      {project.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.image}
          alt={`${project.name} screenshot`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-top pt-8 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div aria-hidden className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-80 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: `radial-gradient(90% 120% at 85% 0%, color-mix(in srgb, ${project.hue} 26%, transparent), transparent 62%), radial-gradient(60% 80% at 0% 100%, color-mix(in srgb, ${project.hue} 10%, transparent), transparent 70%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <span
            className={`absolute bottom-2 left-4 whitespace-nowrap font-display font-semibold leading-[1.15] tracking-tighter transition-transform duration-700 ease-out group-hover:-translate-y-1.5 ${
              tall ? "text-7xl sm:text-8xl" : "text-6xl"
            }`}
            style={{
              backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${project.hue} 55%, var(--color-ink)) 0%, transparent 105%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              opacity: 0.55,
            }}
          >
            {project.name}
          </span>
        </div>
      )}
    </div>
  );
}
