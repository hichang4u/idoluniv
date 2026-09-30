import type { Metadata } from "next";
import Link from "next/link";
import { getLegalInfo } from "@/lib/legal/config";
import { LegalPage, Section, V } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "커뮤니티 가이드라인",
  description: "IdolUniv 에서 함께 지킬 규칙과 신고·처리 기준",
};

// 신고 사유 코드와 같은 순서(PRD 6.1, reports.reason)
const REASONS: { title: string; body: string; urgent?: boolean }[] = [
  { title: "스팸·광고·도배", body: "외부 판매 링크 반복, 같은 글이나 메시지를 연달아 올리는 행위." },
  { title: "욕설·혐오·괴롭힘", body: "특정 팬이나 멤버를 비하하는 말, 다른 팬덤을 공격하는 글." },
  {
    title: "개인정보·사생활 침해",
    body: "아이돌의 비공개 일정·항공편·숙소·연락처, 사생 사진, 멤버 가족이나 일반인의 신상.",
    urgent: true,
  },
  {
    title: "성적인 콘텐츠",
    body: "실존 인물을 성적으로 묘사한 글과 팬픽, 성적 합성물(딥페이크). 실존 인물 팬픽은 쓸 수 있지만 성적 묘사는 허용하지 않습니다.",
    urgent: true,
  },
  { title: "허위 사실·명예훼손", body: "근거 없는 열애·범죄 루머 같은 허위 정보." },
  { title: "저작권·초상권 침해", body: "유료 콘텐츠를 그대로 옮긴 글, 공식 사진의 상업적 이용." },
  { title: "사칭", body: "아이돌·운영자·다른 이용자인 것처럼 행동하는 것." },
];

export default function GuidelinesPage() {
  const info = getLegalInfo();

  return (
    <LegalPage title="커뮤니티 가이드라인" info={info}>
      <p className="text-[15px] leading-7 break-keep">
        IdolUniv 는 여러 그룹의 팬이 함께 쓰는 공간입니다. 다른 팬덤과 멤버를 존중해 주세요. 아래 기준에 어긋나는
        게시물은 신고할 수 있고, 운영자가 확인해 숨깁니다.
      </p>

      <Section id="rules" title="올리면 안 되는 것">
        <ol>
          {REASONS.map((r) => (
            <li key={r.title}>
              <strong>{r.title}</strong>
              {r.urgent && <span className="ml-1 text-sm text-destructive">(우선 처리)</span>} — {r.body}
            </li>
          ))}
        </ol>
        <p>
          비공개 일정·숙소 정보, 사생 사진, 가족 신상은 신고가 없어도 운영자가 발견하는 즉시 숨깁니다.
        </p>
      </Section>

      <Section id="report" title="신고하는 방법">
        <ul>
          <li>게시글과 댓글은 오른쪽 위 더보기 메뉴에서, 라운지 메시지는 길게 눌러 신고할 수 있습니다.</li>
          <li>신고한 게시물은 신고한 사람의 화면에서 바로 가려집니다.</li>
          <li>서로 다른 이용자 3명이 신고하면 운영자 확인 전까지 모두에게 임시로 숨겨집니다.</li>
        </ul>
      </Section>

      <Section id="handling" title="처리 기준과 시간">
        <ul>
          <li>개인정보·사생활 침해, 성적인 콘텐츠: 신고 후 12시간 안에 처리하는 것을 목표로 합니다.</li>
          <li>그 밖의 신고: 신고 후 48시간 안에 처리하는 것을 목표로 합니다.</li>
          <li>1인 운영이라 밤과 주말에는 처리가 늦어질 수 있습니다.</li>
        </ul>
      </Section>

      <Section id="sanctions" title="이용 제한">
        <p>
          지금은 기준에 어긋난 게시물을 숨기는 조치를 합니다. 반복되거나 정도가 무거우면 계정 이용을 제한할 수
          있습니다.
        </p>
      </Section>

      <Section id="appeal" title="이의 제기와 권리자 신고">
        <ul>
          <li>
            숨김 처리에 이의가 있으면: <V field={info.contactEmail} />
          </li>
          <li>
            저작권·초상권 등 권리 침해 신고(소속사 포함): <V field={info.rightsEmail} />
          </li>
        </ul>
        <p>
          자세한 내용은{" "}
          <Link href="/terms" className="underline underline-offset-4">
            이용약관
          </Link>
          을 따릅니다.
        </p>
      </Section>
    </LegalPage>
  );
}
