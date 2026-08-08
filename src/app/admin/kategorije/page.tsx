import { SectionTreeEditor } from "@/components/admin/section-tree-editor";
import { getSectionTree } from "@/lib/sections";

export default async function AdminKategorijePage() {
  const tree = await getSectionTree(true);

  return <SectionTreeEditor tree={tree} />;
}
