import { repairActivityService } from "@/features/repair-activities/repair-activity-service";
import { AppError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { getRequestId } from "@/lib/api/request-id";
import { assertSameOrigin, requestContext } from "@/lib/auth/request";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; regId: string }> },
) {
  const requestId = getRequestId(request.headers);
  const context = requestContext(request, requestId);
  try {
    assertSameOrigin(request);
    const ip = context.ipAddress ?? "unknown";
    enforceRateLimit(`activity-signup:${ip}`, 10, 60_000);
    const { id, regId } = await params;
    if (!id || !regId) throw new AppError("VALIDATION_FAILED", "参数无效");
    const body = (await request.json()) as Record<string, unknown>;
    const result = await repairActivityService.updateIssueType(
      id,
      regId,
      {
        issueType: body.issueType,
        editToken: String(body.editToken ?? ""),
      },
      context,
    );
    return apiSuccess(result, requestId);
  } catch (error) {
    return apiFailure(error, requestId);
  }
}
