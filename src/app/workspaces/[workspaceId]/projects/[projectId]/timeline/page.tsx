import { TimelineView } from "@/components/timeline/TimelineView";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const { workspaceId, projectId } = await params;
  return <TimelineView workspaceId={workspaceId} projectId={projectId} />;
}
