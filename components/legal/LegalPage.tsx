import type { ReactNode } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { formatDate, type LegalInfo } from "@/lib/legal/config";

type FieldValue = LegalInfo[keyof Omit<LegalInfo, "missing">];

// 환경변수 값 또는 "설정 필요" 표시. 빈칸으로 조용히 배포되지 않게 눈에 띄게 보여 준다.
export function V({ field, date = false }: { field: FieldValue; date?: boolean }) {
  if (field.value) return <>{date ? formatDate(field.value) : field.value}</>;
  return (
    <mark className="rounded bg-destructive/15 px-1 text-destructive">
      [설정 필요{process.env.NODE_ENV !== "production" ? `: ${field.env}` : ""}]
    </mark>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="space-y-3">
      <h2 id={`${id}-h`} className="text-base font-semibold text-foreground break-keep">
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-7 text-foreground/90 break-keep [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function LegalPage({
  title,
  info,
  children,
}: {
  title: string;
  info: LegalInfo;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl pb-12">
      <TopBar big title={title} />
      <div className="space-y-8 px-4 pt-2 md:px-0 md:pt-0">
        <header className="space-y-3">
          <p className="text-sm text-muted-foreground">
            시행일: <V field={info.effectiveDate} date />
          </p>
          <div role="note" className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            이 문서는 법무 검토 전 초안입니다. 공개 출시 전에 검토를 거쳐 확정합니다.
          </div>
          {info.missing.length > 0 && (
            <div role="alert" className="rounded-lg border border-destructive/40 px-4 py-3 text-sm text-destructive">
              운영자 정보 일부가 아직 설정되지 않았습니다.
              {process.env.NODE_ENV !== "production" && <> ({info.missing.join(", ")})</>}
            </div>
          )}
        </header>
        {children}
      </div>
    </article>
  );
}
