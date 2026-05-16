"use client"

import "../theory/theory.css"
import "../workspace.css"
import WorkspaceHeader from "../../components/WorkspaceHeader"
import WorkspaceLayout from "@/components/WorkspaceLayout"
import WorkspaceTour from "@/components/WorkspaceTour"
// import IMG from "../../public/lab_background.png"

export default function Home() {
  return (
    <div className="workspace-page theoryContent">
      <WorkspaceHeader />
      <WorkspaceLayout />
      <WorkspaceTour />
    </div>
  )
}
