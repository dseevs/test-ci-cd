"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useStore, useAllExperimentsVisited } from "@/store/useStore"
import MainWorspace from "@/components/MainWorspace"
import SideWorkspace from "@/components/SideWorkspace"

export default function WorkspaceLayout() {
  const router = useRouter()
  const resetExperiment = useStore((s) => s.resetExperiment)

  const allVisited = useAllExperimentsVisited()

  const handleRestart = () => {
    resetExperiment()
    router.push("/")
  }

  return (
    <main className="workspace-main">
      <section
        className="workspace-canvas-wrap"
        aria-label="Experiment area"
        data-tour="main-workspace"
      >
        <div className="workspace-canvas-inner">
          <MainWorspace />
        </div>
      </section>

      <aside className="workspace-sidebar" aria-label="Results and actions" data-tour="side-workspace">
        <div className="workspace-sidebar__content">
          <SideWorkspace />
        </div>
        <div className="workspace-sidebar__actions">
          {/* <Button
            onClick={handleRestart}
            disabled={!allVisited}
            title={allVisited ? "Restart the lab" : "Visit all 4 activities to enable Restart"}
            className="!rounded-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md"
          >
            Restart
          </Button> */}
        </div>
      </aside>
    </main>
  )
}
