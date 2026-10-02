import type { Metadata } from "next";
import Link from "next/link";
import { getLegalInfo } from "@/lib/legal/config";
import { LegalPage, Section, V } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "이용약관",
  description: "IdolUniv 서비스 이용약관",
};

export default function TermsPage() {
  const info = getLegalInfo();

  return (
    <LegalPage title="이용약관" info={info}>
      <Section id="purpose" title="제1조 목적">
        <p>
          이 약관은 <V field={info.operatorName} />
          {info.businessNumber.value && <> (사업자등록번호 {info.businessNumber.value})</>}(이하 &ldquo;운영자&rdquo;)가
          제공하는 IdolUniv(이하 &ldquo;서비스&rdquo;)의 이용 조건과 절차, 운영자와 이용자의 권리·의무를 정합니다.
        </p>
      </Section>

      <Section id="unofficial" title="제2조 비공식 팬 커뮤니티">
        <p>
          서비스는 팬이 운영하는 비공식 커뮤니티이며, 아이돌 그룹·소속사·공식 팬클럽과 관계가 없습니다. 서비스에
          표시되는 그룹 이름은 해당 그룹을 가리키기 위한 것이며, 공식 로고와 사진을 쓰지 않습니다.
        </p>
      </Section>

      <Section id="signup" title="제3조 가입과 계정">
        <ul>
          <li>만 14세 이상만 가입할 수 있습니다.</li>
          <li>Google 계정으로 로그인한 뒤 닉네임을 정하고 이 약관과 개인정보처리방침에 동의하면 가입이 완료됩니다.</li>
          <li>
            닉네임은 2~20자의 한글·영문·숫자·밑줄로 정하며, 다른 이용자·아이돌·운영자를 사칭하거나 혼동을 주는
            닉네임은 쓸 수 없습니다. 닉네임은 30일에 한 번 바꿀 수 있습니다.
          </li>
          <li>계정은 본인만 쓸 수 있으며, 다른 사람에게 넘기거나 빌려줄 수 없습니다.</li>
        </ul>
      </Section>

      <Section id="posts" title="제4조 게시물의 권리와 이용">
        <ul>
          <li>이용자가 작성한 게시물(글·댓글·팬픽·라운지 메시지)의 저작권은 작성자에게 있습니다.</li>
          <li>
            운영자는 서비스 안에서 게시물을 보여 주고 검색되게 하는 데 필요한 범위에서만 게시물을 이용합니다. 게시물을
            서비스 밖에서 판매하거나 다른 목적으로 쓰지 않습니다.
          </li>
          <li>다른 사람의 저작물을 올릴 때는 권리자의 허락이 있거나 법에서 허용하는 범위여야 합니다.</li>
        </ul>
      </Section>

      <Section id="prohibited" title="제5조 금지 행위">
        <p>
          이용자는 아래 행위를 해서는 안 됩니다. 자세한 기준은{" "}
          <Link href="/guidelines" className="underline underline-offset-4">
            커뮤니티 가이드라인
          </Link>
          을 따릅니다.
        </p>
        <ul>
          <li>스팸·광고·도배</li>
          <li>욕설·혐오 표현·괴롭힘, 다른 팬덤이나 멤버에 대한 공격</li>
          <li>아이돌의 비공개 일정·항공편·숙소·연락처 공유, 사생 사진 게시, 일반인의 신상 공개</li>
          <li>성적인 콘텐츠, 실존 인물을 성적으로 묘사한 게시물과 합성물</li>
          <li>근거 없는 허위 사실 유포와 명예훼손</li>
          <li>저작권·초상권 침해</li>
          <li>아이돌·운영자·다른 이용자 사칭</li>
          <li>서비스의 정상 운영을 방해하는 행위(자동화 도구를 이용한 대량 요청 등)</li>
        </ul>
      </Section>

      <Section id="moderation" title="제6조 게시물 관리">
        <ul>
          <li>이용자는 금지 행위에 해당하는 게시물을 신고할 수 있습니다.</li>
          <li>
            운영자는 신고된 게시물이나 금지 행위에 해당한다고 판단한 게시물을 숨길 수 있습니다. 서로 다른 이용자 3명이
            신고한 게시물은 운영자 검토 전까지 자동으로 숨겨질 수 있습니다.
          </li>
          <li>
            숨김 처리에 이의가 있으면 <V field={info.contactEmail} /> 로 이의를 제기할 수 있습니다.
          </li>
          <li>
            권리 침해 신고(저작권·초상권 등)는 <V field={info.rightsEmail} /> 로 받습니다.
          </li>
        </ul>
      </Section>

      <Section id="restriction" title="제7조 이용 제한">
        <p>
          금지 행위가 반복되거나 정도가 무거우면 운영자는 해당 계정의 이용을 제한할 수 있습니다. 제한 내용과 사유는
          이용자에게 알리며, 이용자는 제6조의 방법으로 이의를 제기할 수 있습니다.
        </p>
      </Section>

      <Section id="service" title="제8조 서비스의 변경과 중단">
        <ul>
          <li>서비스는 현재 시험 운영(베타) 중이며, 기능이 바뀌거나 예고 없이 일시 중단될 수 있습니다.</li>
          <li>서비스를 종료할 때는 30일 전에 공지하고, 이용자가 자신의 게시물을 확인할 수 있는 기간을 둡니다.</li>
        </ul>
      </Section>

      <Section id="withdrawal" title="제9조 탈퇴">
        <ul>
          <li>
            탈퇴는 <V field={info.contactEmail} /> 로 요청할 수 있습니다.
          </li>
          <li>
            탈퇴하면 계정 정보는 삭제되지만, 작성한 게시글과 댓글은 작성자 정보 없이 &ldquo;탈퇴한 사용자&rdquo;의 글로
            남습니다. 원하면 탈퇴 전에 직접 삭제할 수 있습니다.
          </li>
        </ul>
      </Section>

      <Section id="liability" title="제10조 책임">
        <ul>
          <li>게시물의 내용에 대한 책임은 작성자에게 있습니다.</li>
          <li>
            운영자는 고의 또는 중대한 과실이 없는 한, 무료로 제공하는 서비스 이용 중 이용자 사이에 생긴 분쟁이나
            게시물로 인한 손해에 대해 책임을 지지 않습니다.
          </li>
        </ul>
      </Section>

      <Section id="changes" title="제11조 약관의 변경">
        <p>
          약관을 바꿀 때는 시행 7일 전(이용자에게 불리한 변경은 30일 전)부터 서비스 공지로 알립니다. 변경에 동의하지
          않으면 탈퇴할 수 있습니다.
        </p>
      </Section>

      <Section id="law" title="제12조 준거법과 분쟁 해결">
        <p>
          이 약관은 대한민국 법률을 따르며, 서비스 이용과 관련한 분쟁은 「민사소송법」에 따른 관할 법원에서
          해결합니다.
        </p>
      </Section>

      <p className="text-sm text-muted-foreground">
        개인정보 처리에 관한 내용은{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          개인정보처리방침
        </Link>
        을 따릅니다.
      </p>
    </LegalPage>
  );
}
