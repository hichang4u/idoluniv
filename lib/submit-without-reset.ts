import { startTransition, type FormEvent } from "react";

// <form action={...}> 은 액션이 끝나면 React 가 폼을 리셋한다. 제어 radio·checkbox 는 DOM 만 초기값으로 돌아가고
// 상태는 그대로 남아, 화면과 다음 제출 값이 어긋난다(팬픽을 골랐는데 text 로 저장되는 식).
// onSubmit 에서 FormData 를 만들어 직접 보내면 리셋이 일어나지 않는다. pending 은 useActionState 가 그대로 준다.
export function submitWithoutReset(action: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(formData));
  };
}
