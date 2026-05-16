import { CreditCard } from 'lucide-react'

export default function TarjetasPage() {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="bg-gray-100 p-6 rounded-full mb-4">
        <CreditCard className="h-10 w-10 text-gray-400" />
      </div>
      <h1 className="text-xl font-bold text-gray-700">Tarjetas</h1>
      <p className="text-gray-400 text-sm mt-2">Próximamente: administrá tus tarjetas de crédito y débito.</p>
    </div>
  )
}
