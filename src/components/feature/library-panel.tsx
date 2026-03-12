import { SidebarContent } from "./sidebar";
import { Button } from "../ui";
import { navigate } from "../../utils";

export function LibraryPanel() {
  return (
    <div class="h-full rounded-3xl border border-white/10 bg-white/5 p-5">
      <SidebarContent />
    </div>
  );
}
