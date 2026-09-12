import { CheckCircle2 } from 'lucide-react'

interface ToastProps {
  message: string
}

function Toast({ message }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 animate-[toastIn_0.25s_ease-out] motion-reduce:animate-none"
    >
      <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        {message}
      </div>
    </div>
  )
}

export default Toast
