import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "홈",
};

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          IdolUniv에 오신 것을 환영합니다
        </h2>
        <p className="text-muted-foreground text-sm">
          팬이 만들고, AI가 잇고, 세계가 함께하는 아이돌 유니버스
        </p>
      </section>
    </div>
  );
}
