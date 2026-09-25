/**
 * 公开维修活动页文案（M1）。
 */
export const repairActivitiesPage = {
  title: "维修活动",
  label: "Activities",
  lead: "电脑医院不定期举办现场维修活动。选择一场活动报名，到场后由成员接待。",
  empty: "暂时没有可展示的维修活动。",
  loadFailed: "活动列表加载失败，请稍后重试。",
  remaining: "剩余名额 {count}",
  capacity: "名额 {registered} / {capacity}",
  activityAt: "活动时间",
  window: "报名时间",
  endedHint: "活动已结束",
  detail: {
    signupTitle: "报名参加",
    lookupTitle: "查询 / 修改故障类型",
    name: "姓名",
    phone: "手机号",
    issueType: "故障类型",
    submitSignup: "提交报名",
    submitLookup: "查询报名",
    submitUpdate: "保存故障类型",
    signupSuccess: "报名成功。请按时到场，并保管好手机号以便查询。",
    lookupSuccess: "已找到报名记录，可修改故障类型。",
    updateSuccess: "故障类型已更新。",
    signupDisabled: "当前不可报名",
    upcomingDisabled: "报名尚未开始",
    closedDisabled: "报名已截止",
    fullDisabled: "名额已满",
    notEditable: "当前状态不可修改故障类型（可能已签到或已接待）。",
  },
  issueTypes: [
    { value: "CLEAN_PASTE", label: "清灰换硅脂" },
    { value: "CLEAN_ONLY", label: "清灰" },
    { value: "OTHER", label: "其他故障" },
  ],
} as const;
