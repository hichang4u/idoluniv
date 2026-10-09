import { reportClientError } from "@/lib/client-errors";

// 브라우저 오류 수집 (F9-6): 처리되지 않은 오류와 거부된 Promise
window.addEventListener("error", (event) => reportClientError("error", event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => reportClientError("unhandledrejection", event.reason));
