// src/app/admin/banner/page.tsx
import BannerAdmin from '@/components/admin/BannerAdmin'

export const metadata = { title: 'Banner publicitario — Admin' }

export default function BannerPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Banner publicitario</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configura el banner promocional que aparece sobre el hero en la página principal.
        </p>
      </div>
      <BannerAdmin />
    </div>
  )
}
