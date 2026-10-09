import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

// 오류·404 같은 상태 화면의 공통 틀 (디자인 리뷰 S10). 아이콘 + 문장으로 알린다(색만으로 전달하지 않음)
export function StatusScreen({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Empty className="min-h-[50dvh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle className="text-xl font-bold text-text-strong break-keep">{title}</EmptyTitle>
        <EmptyDescription className="break-keep">{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent className="flex-row flex-wrap justify-center gap-2">{children}</EmptyContent>}
    </Empty>
  );
}
