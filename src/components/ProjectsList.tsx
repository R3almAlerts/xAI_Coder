import { useState } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { Project } from '../types';

interface ProjectsListProps {
  currentProjectId: string | null;
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onCreateNew: () => void;
}

export function ProjectsList({ 
  currentProjectId, 
  projects, 
  onSelectProject, 
  onCreateNew 
}: ProjectsListProps) {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleEditStart = (proj: Project) => {
    setEditingProjectId(proj.id);
    setEditTitle(proj.title);
  };

  const handleEditSave = (projectId: string) => {
    if (editTitle.trim()) {
      // Call parent onUpdateProject if needed
      console.log('Update project title:', editTitle); // Placeholder
    }
    setEditingProjectId(null);
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
          <button
            onClick={onCreateNew}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="New project"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-200">
          {projects.map((proj) => (
            <li key={proj.id} className="relative">
              <div 
                onClick={() => onSelectProject(proj.id)}
                className={`p-4 hover:bg-gray-100 transition-colors flex items-center justify-between cursor-pointer select-none ${currentProjectId === proj.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
              >
                <div className="flex-1 min-w-0 mr-2">
                  {editingProjectId === proj.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleEditSave(proj.id)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') handleEditSave(proj.id);
                        if (e.key === 'Escape') setEditingProjectId(null);
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  ) : (
                    <div className="truncate text-sm font-medium text-gray-900">
                      {proj.title}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditStart(proj);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                    aria-label="Edit title"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div className="text-gray-500">
            <p className="text-sm font-medium mb-2">No projects yet</p>
            <button
              onClick={onCreateNew}
              className="text-blue-600 hover:text-blue-700 text-sm underline"
            >
              Create a new project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}