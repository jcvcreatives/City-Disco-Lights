import React, { useState } from 'react';
import { Check, Copy, ExternalLink, GitBranch, Globe, Share2, Terminal, X } from 'lucide-react';

interface GitHubPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GITHUB_ACTIONS_YML = `name: Deploy Neon Nights to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build_and_deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm install --legacy-peer-deps

      - name: Build Neon Nights production bundle
        run: npm run build

      - name: Add .nojekyll to dist
        run: touch ./dist/.nojekyll

      - name: Configure GitHub Pages
        uses: actions/configure-pages@v5

      - name: Upload dist artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

export const GitHubPublishModal: React.FC<GitHubPublishModalProps> = ({ isOpen, onClose }) => {
  const [repoUsername, setRepoUsername] = useState<string>('jcvcreatives');
  const [repoName, setRepoName] = useState<string>('City-Disco-Lights');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanUser = repoUsername.trim() || 'jcvcreatives';
  const cleanRepo = repoName.trim() || 'City-Disco-Lights';

  const gitPushCommands = `git init
git add .
git commit -m "Initial release: Neon Nights 60fps 2.5D Nightclub Tycoon"
git branch -M main
git remote add origin https://github.com/${cleanUser}/${cleanRepo}.git
git push -u origin main`;

  const liveGameUrl = `https://${cleanUser}.github.io/${cleanRepo}/`;

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#070312]/90">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-[#160f29] border-[3px] border-cyan-400/70 shadow-[0_12px_40px_rgba(0,0,0,0.85)] overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#231542] via-[#2e1759] to-[#1a1133] border-b-2 border-purple-500/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 flex items-center justify-center border-2 border-white/80 shadow">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black tracking-wide text-white">
                PUBLISH TO GITHUB &amp; SHARE WITH PLAYERS
              </h2>
              <p className="text-xs text-cyan-300 font-mono">
                Pre-configured with relative assets (`base: &apos;./&apos;`) &amp; `.github/workflows/deploy.yml`
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-rose-600 hover:bg-rose-500 border-2 border-[#150d2a] text-white flex items-center justify-center cursor-pointer shadow"
            aria-label="Close GitHub Publish Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* Customizer for Repo URL */}
          <div className="p-4 rounded-2xl bg-[#1e1538] border-2 border-purple-500/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>1. Enter Your GitHub Username &amp; Repo Name</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[11px] font-mono text-emerald-300">
                100% Static Web &amp; Mobile Compatible
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-purple-300 mb-1">
                  GitHub Username
                </label>
                <input
                  type="text"
                  value={repoUsername}
                  onChange={(e) => setRepoUsername(e.target.value)}
                  placeholder="your-username"
                  className="w-full px-3 py-2 rounded-xl bg-[#110b22] border border-purple-500/50 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-purple-300 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="neon-nights-tycoon"
                  className="w-full px-3 py-2 rounded-xl bg-[#110b22] border border-purple-500/50 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Live Playable Link Preview */}
            <div className="flex items-center justify-between gap-2 pt-1 px-3 py-2 rounded-xl bg-[#120b24] border border-cyan-400/40">
              <div className="truncate">
                <span className="text-[10px] font-mono uppercase text-purple-300 block">
                  Your Public Playable Game URL (after push):
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold text-cyan-300 truncate">
                  {liveGameUrl}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard('live_url', liveGameUrl)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-200 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedId === 'live_url' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied URL!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Terminal Commands */}
          <div className="p-4 rounded-2xl bg-[#1e1538] border-2 border-purple-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-fuchsia-400" />
                <span>2. Push This Repo to GitHub</span>
              </span>
              <button
                onClick={() => copyToClipboard('git_cmds', gitPushCommands)}
                className="px-3 py-1 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/60 text-fuchsia-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === 'git_cmds' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Commands!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Git Commands</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-purple-200/90">
              Create a new public repository named <code className="text-cyan-300 font-mono">{cleanRepo}</code> on{' '}
              <a
                href="https://github.com/new"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-300 underline inline-flex items-center gap-1"
              >
                github.com/new <ExternalLink className="w-3 h-3" />
              </a>
              , then run these commands in your project folder:
            </p>

            <pre className="p-3 rounded-xl bg-[#0c071a] border border-purple-500/30 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed">
              {gitPushCommands}
            </pre>
          </div>

          {/* Step 3: Automatic GitHub Pages Workflow */}
          <div className="p-4 rounded-2xl bg-[#1e1538] border-2 border-purple-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                3. Enable GitHub Pages (Included Automatically!)
              </span>
              <button
                onClick={() => copyToClipboard('gh_workflow', GITHUB_ACTIONS_YML)}
                className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === 'gh_workflow' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Workflow!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy .github/workflows/deploy.yml</span>
                  </>
                )}
              </button>
            </div>

            <ol className="list-decimal list-inside text-xs text-purple-100/90 space-y-1.5">
              <li>
                We have already added <code className="text-cyan-300 font-mono">.github/workflows/deploy.yml</code> and{' '}
                <code className="text-cyan-300 font-mono">base: &apos;./&apos;</code> in{' '}
                <code className="text-cyan-300 font-mono">vite.config.ts</code> to your project!
              </li>
              <li>
                On your GitHub repo page, click <strong>Settings</strong> &rarr; <strong>Pages</strong> (left sidebar).
              </li>
              <li>
                Under <strong>Build and deployment &rarr; Source</strong>, select <strong>GitHub Actions</strong>.
              </li>
              <li>
                GitHub will automatically build and host your game at{' '}
                <span className="text-cyan-300 font-mono font-bold">{liveGameUrl}</span> so anyone on PC, Android, or iOS can play!
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#120b22] border-t border-purple-500/30 flex items-center justify-between">
          <span className="text-[11px] font-mono text-purple-300">
            Also compatible with Vercel, Netlify, or itch.io HTML5 ZIP upload (`npm run build` &rarr; `dist/`)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-b from-cyan-400 to-blue-600 text-slate-950 font-black text-xs cursor-pointer shadow"
          >
            Back to Club
          </button>
        </div>
      </div>
    </div>
  );
};
