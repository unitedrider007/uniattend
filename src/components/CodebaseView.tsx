import { useState } from "react";
import { springBootCodeFiles, flutterCodeFiles, postgresSchema, deploymentFiles, CodeFile } from "../data/codebaseTemplates";
import { Coffee, FileCode, FolderClosed, Copy, CheckCircle, Database, Server, Smartphone, Cpu } from "lucide-react";

export default function CodebaseView() {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(springBootCodeFiles[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = [
    {
      title: "Spring Boot Backend (Java)",
      icon: <Server className="w-4 h-4 text-emerald-400" />,
      files: springBootCodeFiles,
    },
    {
      title: "Flutter Client Apps (Dart)",
      icon: <Smartphone className="w-4 h-4 text-blue-400" />,
      files: flutterCodeFiles,
    },
    {
      title: "PostgreSQL Database (SQL)",
      icon: <Database className="w-4 h-4 text-amber-400" />,
      files: [postgresSchema],
    },
    {
      title: "Infrastructure & CI/CD",
      icon: <Cpu className="w-4 h-4 text-purple-400" />,
      files: deploymentFiles,
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
      {/* Banner */}
      <div className="p-6 bg-linear-to-r from-indigo-950 via-slate-900 to-emerald-950/40 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-sans tracking-tight">
            <Coffee className="w-5 h-5 text-indigo-400" />
            UAMS Developer Center & Artifacts
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Ready-to-deploy clean architecture codebases designed for 10,000+ active student records.
          </p>
        </div>
        <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/50 self-start">
          <span className="px-3 py-1 text-[10px] uppercase tracking-wider font-semibold text-indigo-300 font-mono">
            Spring Boot 3.x • Java 21 • Flutter 3.x • Postgres 15
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px] divide-y lg:divide-y-0 lg:divide-x divide-slate-850">
        {/* Left Folder Tree Browser */}
        <div className="lg:col-span-4 bg-slate-950/50 p-4 overflow-y-auto max-h-[600px]">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 font-sans px-2">
            Workspace Source Files
          </h3>

          <div className="space-y-6">
            {categories.map((cat, cIdx) => (
              <div key={cIdx} className="space-y-1">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-slate-300">
                  {cat.icon}
                  <span>{cat.title}</span>
                </div>
                
                <div className="mt-1 pl-4 space-y-0.5 border-l border-slate-805">
                  {cat.files.map((file, fIdx) => {
                    const isSelected = selectedFile.path === file.path;
                    return (
                      <button
                        key={fIdx}
                        id={`btn-code-${cat.title.replace(/\s+/g, '')}-${fIdx}`}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-2 group ${
                          isSelected
                            ? "bg-indigo-950/50 text-indigo-300 border border-indigo-900/30"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                        }`}
                      >
                        <FileCode className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"}`} />
                        <span className="truncate">{file.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-805 px-2">
            <h4 className="text-xs font-bold text-slate-400 mb-2">ER Diagram Spec</h4>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/50 text-[11px] font-mono text-slate-400 space-y-1">
              <div><strong className="text-slate-300">users</strong> (1) ↔ (1) <strong className="text-slate-300">roles</strong></div>
              <div><strong className="text-slate-300">departments</strong> (1) ↔ (N) <strong className="text-slate-300">batches</strong></div>
              <div><strong className="text-slate-300">batches</strong> (1) ↔ (N) <strong className="text-slate-300">students</strong></div>
              <div><strong className="text-slate-300">teachers</strong> (1) ↔ (N) <strong className="text-slate-300">subjects</strong></div>
              <div><strong className="text-slate-300">students</strong> (1) ↔ (N) <strong className="text-slate-300">attendance</strong></div>
              <div><strong className="text-slate-300">attendance</strong> (1) ↔ (N) <strong className="text-slate-300">attendance_audit</strong></div>
            </div>
          </div>
        </div>

        {/* Right Active Source Code Block */}
        <div className="lg:col-span-8 flex flex-col max-h-[600px] overflow-hidden bg-slate-950">
          <div className="bg-slate-900/65 px-4 py-3 border-b border-slate-850 flex items-center justify-between text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2 truncate">
              <FolderClosed className="w-4 h-4 text-indigo-400/80" />
              <span className="text-slate-200 font-sans font-medium">{selectedFile.path}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700/80 hover:text-white transition-colors duration-200"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 md:p-6 font-mono text-xs leading-relaxed text-slate-300 bg-slate-950">
            <pre className="whitespace-pre"><code>{selectedFile.content}</code></pre>
          </div>
        </div>
      </div>
    </div>
  );
}
