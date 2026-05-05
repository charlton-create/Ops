"use client";

import { Header } from "@/components/layout/Header";
import { useProjects, useUpdateProjectTask } from "@/lib/hooks/useProjects";

const TYPE_COLORS: Record<string, string> = {
  customer: "bg-green-950 text-green-400",
  product: "bg-blue-950 text-blue-400",
  marketing: "bg-purple-950 text-purple-400",
  compliance: "bg-orange-950 text-orange-400",
};

const STATUS_COLORS: Record<string, string> = {
  "Not Started": "text-gray-400",
  "In Progress": "text-yellow-400",
  "Pending": "text-orange-400",
  "Completed": "text-green-400",
};

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const updateTask = useUpdateProjectTask();

  const activeCount = projects?.filter((p) => p.status === "In Progress").length ?? 0;
  const completedCount = projects?.filter((p) => p.status === "Completed").length ?? 0;

  return (
    <div>
      <Header title="Projects" icon="📁" subtitle="Project Management" gradient="from-amber-600 to-yellow-500">
        <div className="flex gap-4 text-sm">
          <div><p className="text-white/60 text-xs">Active</p><p className="text-white font-bold">{activeCount}</p></div>
          <div><p className="text-white/60 text-xs">Completed</p><p className="text-white font-bold">{completedCount}</p></div>
          <div><p className="text-white/60 text-xs">Total</p><p className="text-white font-bold">{projects?.length ?? 0}</p></div>
        </div>
      </Header>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-48 bg-gray-900 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects?.map((project) => (
            <div key={project.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{project.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[project.type ?? ""] ?? "bg-gray-800 text-gray-400"}`}>
                      {project.type}
                    </span>
                    <span className={`text-xs font-medium ${STATUS_COLORS[project.status] ?? "text-gray-400"}`}>
                      {project.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: project.owner?.color ?? "#6B7280" }}>
                    {project.owner?.name?.charAt(0)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white font-medium">{project.progress}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Due Date */}
              {project.due && (
                <p className="text-xs text-gray-500 mb-3">
                  Due: {new Date(project.due).toLocaleDateString()}
                </p>
              )}

              {/* Task Checklist */}
              <div className="space-y-1.5">
                {project.tasks.map((task, idx) => (
                  <label key={task.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={(e) => updateTask.mutate({ projectId: project.id, taskIdx: idx, done: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 w-4 h-4"
                    />
                    <span className={`text-sm ${task.done ? "text-gray-500 line-through" : "text-gray-300 group-hover:text-white"}`}>
                      {task.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
