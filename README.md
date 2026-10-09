This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 운영

### 첫 관리자 지정

관리자는 `admins` 테이블로 판별한다(D-3). 앱에는 관리자를 지정하는 화면이 없으므로 Supabase 대시보드 SQL 에디터에서 넣는다.

1. 지정할 사람이 먼저 로그인하고 닉네임을 정한다(온보딩 완료).
2. SQL 에디터에서 닉네임으로 id 를 찾아 넣는다.

```sql
insert into public.admins (user_id)
select id from public.users where nickname = '<닉네임>';
```

3. 그 사람이 `/me` 에서 "관리자" 링크가 보이는지, `/admin` 이 열리는지 확인한다.

해제는 `delete from public.admins where user_id = '<id>';`. 관리자 화면(`/admin`)은 신고 큐·그룹·처리 기록 세 개이고, 콘텐츠 삭제 기능은 없다(숨김만, 증거 보존).
