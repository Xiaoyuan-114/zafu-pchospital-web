import { Button } from "@/components/ui/Button";
import { memberCopy } from "@/config/member";

/**
 * MemberShortcuts —— 快捷操作
 *
 * 保留现有维修与个人资料入口，并补上 M4 的通知与收藏页。
 */

export function MemberShortcuts() {
  const copy = memberCopy.dashboard;
  return (
    <div className="member-shortcuts">
      <Button href="/member/repairs/new" variant="solid">
        {copy.quickNew}
      </Button>
      <Button href="/member/repairs">{copy.quickAll}</Button>
      <Button href="/member/profile">{copy.quickProfile}</Button>
      <Button href="/member/notifications">{copy.quickNotifications}</Button>
      <Button href="/member/favorites">{copy.quickFavorites}</Button>
    </div>
  );
}
