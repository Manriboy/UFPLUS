// src/app/(public)/privacidad/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidad | UFPLUS',
  description: 'Conoce cómo UFPLUS recopila, usa y protege tus datos personales.',
}

const LAST_UPDATED = '15 de junio de 2025'

export default function PrivacidadPage() {
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-sm text-gray-400 mb-2">Actualizado el {LAST_UPDATED}</p>
        <h1 className="font-display text-3xl font-bold text-brand-text mb-2">Política de Privacidad</h1>
        <p className="text-gray-500 mb-10">
          En <strong>UFPLUS</strong> nos comprometemos a proteger la información personal de nuestros usuarios.
          Esta política describe qué datos recopilamos, cómo los usamos y cuáles son tus derechos.
        </p>

        <Section title="1. ¿Quiénes somos?">
          <p>
            UFPLUS es una plataforma de inversión inmobiliaria que conecta a inversionistas con proyectos
            de departamentos nuevos y usados en Chile. Operamos bajo las leyes chilenas, incluyendo la
            Ley N° 19.628 sobre Protección de la Vida Privada.
          </p>
        </Section>

        <Section title="2. Datos que recopilamos">
          <p className="mb-3">Recopilamos información en dos contextos:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Formulario de contacto (leads):</strong> nombre, correo electrónico, teléfono, renta mensual aproximada y estado Dicom. Estos datos nos permiten orientarte hacia las mejores opciones de inversión.</li>
            <li><strong>Registro de cuenta:</strong> nombre, correo electrónico, contraseña (almacenada con hash seguro) y número de teléfono. Para usuarios Broker también se solicita el nombre de empresa o nombre comercial.</li>
            <li><strong>Publicación de propiedades:</strong> dirección, coordenadas geográficas, fotos, precio, características del inmueble y datos del propietario o broker.</li>
            <li><strong>Uso de la plataforma:</strong> datos técnicos como dirección IP, tipo de navegador y páginas visitadas, recopilados automáticamente con fines de seguridad y mejora del servicio.</li>
          </ul>
        </Section>

        <Section title="3. ¿Para qué usamos tus datos?">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Contactarte para presentarte proyectos de inversión acordes a tu perfil financiero.</li>
            <li>Gestionar tu cuenta y las propiedades que publicas en la plataforma.</li>
            <li>Enviar correos transaccionales (confirmación de cuenta, recuperación de contraseña, notificaciones de estado).</li>
            <li>Analizar el uso de la plataforma para mejorar nuestros servicios.</li>
            <li>Cumplir con obligaciones legales o regulatorias aplicables.</li>
          </ul>
        </Section>

        <Section title="4. ¿Con quién compartimos tus datos?">
          <p className="mb-3">No vendemos ni cedemos tu información personal a terceros con fines comerciales. Podemos compartir datos con:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Cloudinary:</strong> almacenamiento y optimización de imágenes subidas a la plataforma.</li>
            <li><strong>Proveedores de infraestructura:</strong> Vercel (alojamiento web) y Neon/Railway (base de datos), bajo acuerdos de confidencialidad.</li>
            <li><strong>Desarrolladoras inmobiliarias:</strong> únicamente cuando el usuario ha solicitado información sobre un proyecto específico.</li>
            <li><strong>Autoridades competentes:</strong> cuando la ley chilena así lo exija.</li>
          </ul>
        </Section>

        <Section title="5. Almacenamiento y seguridad">
          <p>
            Tus datos se almacenan en servidores seguros ubicados en la región de Sudamérica.
            Las contraseñas se almacenan usando bcrypt con 12 rondas de hash. Las comunicaciones
            entre tu navegador y nuestra plataforma se realizan mediante HTTPS/TLS.
            Implementamos controles de acceso por roles para que solo el personal autorizado
            pueda acceder a información sensible.
          </p>
        </Section>

        <Section title="6. Tus derechos">
          <p className="mb-3">De acuerdo con la Ley N° 19.628, tienes derecho a:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Acceder</strong> a los datos personales que tenemos sobre ti.</li>
            <li><strong>Rectificar</strong> información incorrecta o desactualizada.</li>
            <li><strong>Cancelar</strong> tus datos cuando ya no sean necesarios para los fines para los que fueron recopilados.</li>
            <li><strong>Oponerte</strong> al tratamiento de tus datos para fines de marketing.</li>
          </ul>
          <p className="mt-3">
            Para ejercer cualquiera de estos derechos, escríbenos a{' '}
            <a href="mailto:contacto@ufplus.cl" className="text-brand-primary hover:underline">contacto@ufplus.cl</a>.
          </p>
        </Section>

        <Section title="7. Cookies y tecnologías similares">
          <p>
            Utilizamos cookies de sesión para mantener tu autenticación en la plataforma.
            No utilizamos cookies de seguimiento de terceros con fines publicitarios.
            Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar
            el funcionamiento de algunas áreas del sitio.
          </p>
        </Section>

        <Section title="8. Retención de datos">
          <p>
            Conservamos tus datos mientras tu cuenta esté activa o sea necesario para prestarte
            el servicio. Los leads (consultas de contacto) se conservan por un máximo de 2 años
            desde su recepción. Puedes solicitar la eliminación de tu cuenta y datos asociados
            en cualquier momento.
          </p>
        </Section>

        <Section title="9. Cambios a esta política">
          <p>
            Podemos actualizar esta política ocasionalmente. Te notificaremos cambios significativos
            por correo electrónico o mediante un aviso prominente en el sitio. La fecha de última
            actualización siempre estará visible al inicio de este documento.
          </p>
        </Section>

        <Section title="10. Contacto">
          <p>
            Si tienes preguntas sobre esta política o sobre el tratamiento de tus datos, puedes
            contactarnos en:
          </p>
          <div className="mt-3 text-sm space-y-1">
            <p><strong>UFPLUS</strong></p>
            <p>Correo: <a href="mailto:contacto@ufplus.cl" className="text-brand-primary hover:underline">contacto@ufplus.cl</a></p>
            <p>Teléfono: <a href="tel:+56912345678" className="text-brand-primary hover:underline">+56 9 1234 5678</a></p>
            <p>Santiago de Chile</p>
          </div>
        </Section>

        <div className="mt-12 pt-6 border-t border-gray-100">
          <Link href="/" className="text-sm text-brand-primary hover:underline">← Volver al inicio</Link>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-brand-text mb-3">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  )
}
