import type { Metadata } from "next";
import Link from "next/link";
import { getLegalInfo } from "@/lib/legal/config";
import { LegalPage, Section, V } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "IdolUniv 가 수집하는 개인정보와 처리 방법",
};

export default function PrivacyPage() {
  const info = getLegalInfo();

  return (
    <LegalPage title="개인정보처리방침" info={info}>
      <p className="text-[15px] leading-7 break-keep">
        <V field={info.operatorName} />(이하 &ldquo;운영자&rdquo;)는 IdolUniv(이하 &ldquo;서비스&rdquo;)를 운영하면서
        이용자의 개인정보를 「개인정보 보호법」에 따라 처리합니다. 서비스는 아이돌 소속사와 관계없는 비공식 팬
        커뮤니티입니다.
      </p>

      <Section id="items" title="1. 처리하는 개인정보 항목">
        <ul>
          <li>
            <strong>Google 로그인 시 받는 정보</strong>: 이메일 주소, 이름, 프로필 사진 주소. 서비스는 이메일과 프로필
            사진 주소를 저장하며, 이메일은 다른 이용자에게 공개하지 않습니다.
          </li>
          <li>
            <strong>가입 후 입력하는 정보</strong>: 닉네임, 만 14세 이상 확인 및 약관 동의 시각과 동의한 약관 버전.
          </li>
          <li>
            <strong>이용 중 생기는 정보</strong>: 작성한 게시글·댓글·라운지 메시지, 좋아요·스크랩, 신고 내역, 글 조회
            기록.
          </li>
          <li>
            <strong>자동으로 수집되는 정보</strong>: 쿠키(아래 7항), 접속 IP 주소·접속 시각·브라우저 정보 등 서버
            접속 기록.
          </li>
        </ul>
      </Section>

      <Section id="purpose" title="2. 처리 목적">
        <ul>
          <li>회원 식별과 로그인 유지</li>
          <li>게시판·라운지 등 커뮤니티 기능 제공</li>
          <li>도배·사칭·권리 침해 등 부정 이용 방지, 신고 처리와 이용 제한</li>
          <li>문의·이의 제기 응대</li>
        </ul>
      </Section>

      <Section id="retention" title="3. 보유 기간과 파기">
        <ul>
          <li>회원 정보는 탈퇴할 때까지 보유하고, 탈퇴하면 지체 없이 삭제합니다.</li>
          <li>
            탈퇴해도 이미 작성한 게시글과 댓글은 삭제되지 않고 작성자 정보 없이 &ldquo;탈퇴한 사용자&rdquo;의 글로
            남습니다. 탈퇴 전에 직접 삭제할 수 있습니다.
          </li>
          <li>라운지 메시지는 작성 후 90일이 지나면 삭제합니다.</li>
          <li>
            신고 내역과 처리 기록은 분쟁 대응과 이의 제기 처리를 위해 처리 종료 후 1년간 보관한 뒤 삭제합니다.
          </li>
          <li>
            장애 복구를 위한 데이터베이스 백업에는 삭제된 정보가 백업 보관 기간 동안 남아 있을 수 있으며, 기간이
            지나면 함께 삭제됩니다.
          </li>
          <li>법령에서 보관을 요구하는 경우에는 그 기간 동안 보관합니다.</li>
        </ul>
      </Section>

      <Section id="third-party" title="4. 제3자 제공">
        <p>운영자는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 따른 요청이 있는 경우는 예외입니다.</p>
      </Section>

      <Section id="processors" title="5. 처리 위탁과 국외 이전">
        <p>서비스 운영을 위해 아래 업체에 개인정보 처리를 맡기며, 이 과정에서 개인정보가 국외에 저장될 수 있습니다.</p>
        <ul>
          <li>
            <strong>Supabase, Inc.</strong> — 데이터베이스·로그인 처리. 저장 위치: <V field={info.supabaseRegion} />. 이전
            항목: 1항의 정보 전체. 이전 방법: 네트워크를 통한 전송.
          </li>
          <li>
            <strong>Vercel, Inc.</strong> — 웹 호스팅과 접속 기록. 처리 위치: <V field={info.vercelRegion} />. 이전 항목:
            접속 기록, 쿠키.
          </li>
        </ul>
        <p>보유 기간은 3항과 같습니다. 국외 이전을 원하지 않으면 서비스 이용을 중단하고 탈퇴를 요청할 수 있습니다.</p>
      </Section>

      <Section id="rights" title="6. 이용자의 권리와 행사 방법">
        <ul>
          <li>자신의 개인정보를 열람·정정·삭제하거나 처리 정지를 요구할 수 있습니다.</li>
          <li>닉네임은 마이 화면에서 직접 바꿀 수 있습니다(30일에 한 번).</li>
          <li>
            그 밖의 요청과 탈퇴는 <V field={info.contactEmail} /> 로 보내 주시면 본인 확인 후 지체 없이 처리합니다.
          </li>
        </ul>
      </Section>

      <Section id="cookies" title="7. 쿠키">
        <ul>
          <li>
            <strong>로그인 쿠키</strong>: 로그인 상태를 유지합니다. 거부하면 로그인할 수 없습니다.
          </li>
          <li>
            <strong>조회 중복 방지 쿠키</strong>(<code>vid</code>): 로그인하지 않은 방문자의 같은 글 조회가 24시간 안에
            여러 번 세어지지 않게 하는 무작위 식별자입니다. 개인을 알아보는 데 쓰지 않습니다.
          </li>
          <li>
            <strong>화면 설정 쿠키</strong>: 사이드바 열림 상태 같은 화면 설정을 기억합니다.
          </li>
        </ul>
        <p>브라우저 설정에서 쿠키를 거부하거나 삭제할 수 있습니다. 광고·추적용 쿠키는 쓰지 않습니다.</p>
      </Section>

      <Section id="children" title="8. 만 14세 미만 아동">
        <p>서비스는 만 14세 이상만 가입할 수 있으며, 만 14세 미만 아동의 개인정보를 수집하지 않습니다.</p>
      </Section>

      <Section id="security" title="9. 안전성 확보 조치">
        <ul>
          <li>모든 통신은 암호화(HTTPS)됩니다.</li>
          <li>데이터베이스 접근 권한을 최소화하고, 이메일 등 비공개 정보는 다른 이용자가 조회할 수 없게 제한합니다.</li>
          <li>관리자 권한은 별도로 지정된 계정에만 부여합니다.</li>
        </ul>
      </Section>

      <Section id="officer" title="10. 개인정보 보호책임자">
        <ul>
          <li>
            책임자: <V field={info.privacyOfficerName} />
          </li>
          <li>
            연락처: <V field={info.privacyOfficerEmail} />
          </li>
        </ul>
        <p>
          개인정보 침해에 대한 상담은 개인정보침해신고센터(국번 없이 118), 개인정보분쟁조정위원회(1833-6972)에도 할 수
          있습니다.
        </p>
      </Section>

      <Section id="changes" title="11. 방침의 변경">
        <p>
          이 방침을 바꿀 때는 시행 7일 전부터 서비스 공지로 알립니다. 관련 문서:{" "}
          <Link href="/terms" className="underline underline-offset-4">
            이용약관
          </Link>
          ,{" "}
          <Link href="/guidelines" className="underline underline-offset-4">
            커뮤니티 가이드라인
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
