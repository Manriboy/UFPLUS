// src/app/(public)/terminos/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Términos de Uso | UFPLUS',
  description: 'Lee los términos y condiciones que rigen el uso de la plataforma UFPLUS.',
}

const LAST_UPDATED = '15 de junio de 2025'

export default function TerminosPage() {
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-sm text-gray-400 mb-2">Actualizado el {LAST_UPDATED}</p>
        <h1 className="font-display text-3xl font-bold text-brand-text mb-2">Términos de Uso</h1>
        <p className="text-gray-500 mb-10">
          Al acceder y utilizar la plataforma <strong>UFPLUS</strong>, aceptas los siguientes términos
          y condiciones. Te recomendamos leerlos detenidamente antes de usar nuestros servicios.
        </p>

        <Section title="1. Aceptación de los términos">
          <p>
            El uso de la plataforma UFPLUS implica la aceptación plena de estos Términos de Uso.
            Si no estás de acuerdo con alguno de ellos, debes abstenerte de usar el sitio.
            UFPLUS se reserva el derecho de modificar estos términos en cualquier momento,
            notificando los cambios con al menos 15 días de anticipación mediante aviso en el sitio
            o por correo electrónico.
          </p>
        </Section>

        <Section title="2. Descripción del servicio">
          <p className="mb-2">
            UFPLUS es una plataforma digital que ofrece los siguientes servicios:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Showcase de proyectos nuevos:</strong> presentación de proyectos inmobiliarios de departamentos en Santiago y otras ciudades de Chile, con información de tipologías, precios en UF, videos y condiciones comerciales.</li>
            <li><strong>Stock de departamentos usados:</strong> publicación y búsqueda de departamentos de segunda mano ofrecidos por propietarios y brokers registrados.</li>
            <li><strong>Captación de leads:</strong> formulario de contacto que conecta a potenciales inversionistas con el equipo de asesores de UFPLUS.</li>
            <li><strong>Panel de administración:</strong> herramienta interna para la gestión de proyectos, leads y usuarios por parte del equipo de UFPLUS.</li>
          </ul>
          <p className="mt-2">
            UFPLUS actúa como intermediario de información y no es parte de ninguna transacción
            inmobiliaria que se genere entre compradores, vendedores o arrendatarios.
          </p>
        </Section>

        <Section title="3. Registro de usuarios">
          <p className="mb-2">
            Para publicar propiedades o acceder al panel de administración es necesario crear una cuenta.
            Al registrarte, te comprometes a:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Proporcionar información veraz, actualizada y completa.</li>
            <li>Mantener la confidencialidad de tus credenciales de acceso.</li>
            <li>Notificar inmediatamente a UFPLUS ante cualquier uso no autorizado de tu cuenta.</li>
            <li>No ceder ni compartir tu cuenta con terceros.</li>
          </ul>
          <p className="mt-2">
            UFPLUS se reserva el derecho de suspender o eliminar cuentas que incumplan estos términos
            o las leyes chilenas aplicables.
          </p>
        </Section>

        <Section title="4. Publicación de propiedades">
          <p className="mb-2">
            Los usuarios con rol de Propietario o Broker pueden publicar departamentos en el stock de
            propiedades usadas. Al hacerlo, declaran y garantizan que:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Son propietarios de la propiedad o cuentan con autorización expresa para publicarla.</li>
            <li>La información publicada (precio, superficie, características) es veraz y no induce a error.</li>
            <li>Las fotografías son propias o cuentan con los derechos de uso correspondientes.</li>
            <li>La propiedad no tiene impedimentos legales que obstaculicen su venta o arriendo.</li>
          </ul>
          <p className="mt-2">
            UFPLUS no verifica de forma independiente la exactitud de la información publicada por usuarios.
            Toda publicación queda sujeta a revisión y aprobación interna antes de ser visible al público.
          </p>
        </Section>

        <Section title="5. Conducta prohibida">
          <p className="mb-2">Está expresamente prohibido:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Publicar información falsa, engañosa o fraudulenta.</li>
            <li>Usar la plataforma para actividades ilegales o contrarias a la moral y al orden público.</li>
            <li>Intentar acceder sin autorización a sistemas, cuentas o datos de otros usuarios.</li>
            <li>Usar herramientas automatizadas (bots, scrapers) para extraer información de la plataforma sin autorización escrita de UFPLUS.</li>
            <li>Publicar contenido que infrinja derechos de propiedad intelectual de terceros.</li>
            <li>Enviar comunicaciones no solicitadas (spam) a través de la plataforma.</li>
          </ul>
        </Section>

        <Section title="6. Propiedad intelectual">
          <p>
            Todo el contenido de UFPLUS —incluyendo logotipos, diseños, textos, imágenes propias,
            código fuente y estructura de la plataforma— es propiedad exclusiva de UFPLUS o de sus
            licenciantes. Queda prohibida su reproducción, distribución o uso comercial sin
            autorización escrita previa. El contenido publicado por usuarios (fotos de propiedades,
            descripciones) sigue siendo de su autoría, pero el usuario otorga a UFPLUS una licencia
            no exclusiva para mostrarlo en la plataforma durante la vigencia de la publicación.
          </p>
        </Section>

        <Section title="7. Limitación de responsabilidad">
          <p className="mb-2">UFPLUS no se hace responsable de:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>La veracidad de la información publicada por terceros (propietarios, brokers, desarrolladoras).</li>
            <li>El resultado de transacciones inmobiliarias originadas en la plataforma.</li>
            <li>Interrupciones del servicio por causas ajenas a nuestro control (fuerza mayor, fallas de proveedores externos).</li>
            <li>Pérdidas económicas derivadas del uso o imposibilidad de uso de la plataforma.</li>
          </ul>
          <p className="mt-2">
            UFPLUS actúa como medio de publicación y difusión de información inmobiliaria, y no
            presta servicios de corretaje de propiedades, asesoría financiera ni legal.
          </p>
        </Section>

        <Section title="8. Precios y comisiones">
          <p>
            La publicación de propiedades en UFPLUS puede estar sujeta a tarifas o comisiones según el
            tipo de usuario y el plan contratado. Las condiciones económicas vigentes se comunicarán
            directamente al usuario al momento del registro o de la activación de su cuenta.
            UFPLUS se reserva el derecho de modificar sus tarifas, notificando con al menos 30 días
            de anticipación a los usuarios afectados.
          </p>
        </Section>

        <Section title="9. Privacidad">
          <p>
            El tratamiento de tus datos personales se rige por nuestra{' '}
            <Link href="/privacidad" className="text-brand-primary hover:underline">Política de Privacidad</Link>,
            que forma parte integrante de estos Términos de Uso.
          </p>
        </Section>

        <Section title="10. Ley aplicable y jurisdicción">
          <p>
            Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia
            derivada de su interpretación o aplicación será sometida a los tribunales ordinarios
            de justicia de Santiago de Chile, renunciando las partes a cualquier otro fuero o
            jurisdicción que pudiera corresponderles.
          </p>
        </Section>

        <Section title="11. Contacto">
          <p>
            Para cualquier consulta sobre estos términos, contáctanos en:
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
