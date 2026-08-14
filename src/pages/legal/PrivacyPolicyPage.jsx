import { useSettings } from "../../context/SettingsContext"
import "./legalpages.css"

function PrivacyPolicyPage() {
  const { settings } = useSettings()
  const contactEmail = settings.email || "hola@cloudi.mx"
  const address = settings.address || "domicilio disponible en los medios oficiales de contacto de Cloudi"

  return (
    <section className="legal-document-page">
      <div className="container-narrow">
        <article className="legal-document">
          <h1>Aviso de Privacidad</h1>

          <p>
            <strong>Grupo Cloudi Software S.A. de C.V.</strong>, conocido comercialmente como{" "}
            <strong>Cloudi</strong> y operador de la plataforma <strong>CloudiShop</strong>, con
            domicilio para efectos de contacto en <strong>{address}</strong>, es responsable del
            tratamiento, uso, resguardo y protección de los datos personales que recaba a través
            de sus sitios web, plataformas de comercio electrónico, formularios, medios digitales,
            canales de atención, contratos, integraciones, soporte técnico y herramientas de software.
          </p>

          <p>
            Este Aviso de Privacidad se emite en cumplimiento de la Ley Federal de Protección de
            Datos Personales en Posesión de los Particulares, su Reglamento y demás disposiciones
            aplicables en México.
          </p>

          <h2>Datos personales que podemos recabar</h2>

          <p>
            Podemos recabar datos de identificación, contacto, facturación, envío, pago, historial
            de compras, preferencias comerciales, información de soporte, datos de navegación,
            datos técnicos del dispositivo, dirección IP, identificadores de sesión, cookies,
            registros de uso, datos relacionados con cuentas de usuario, información de empresas,
            datos fiscales y cualquier información necesaria para prestar servicios de ecommerce,
            software, administración de tiendas, automatización, comunicación y soporte.
          </p>

          <p>
            En operaciones de pago, los datos financieros pueden ser procesados por pasarelas de pago,
            bancos, proveedores antifraude o terceros autorizados. CloudiShop no necesariamente almacena
            todos los datos completos de tarjetas bancarias; cuando intervienen proveedores externos, el
            tratamiento se sujeta también a sus propias políticas y estándares de seguridad.
          </p>

          <h2>Finalidades primarias</h2>

          <p>
            Sus datos personales serán utilizados para crear y administrar cuentas, procesar compras,
            pedidos, pagos, facturación, envíos, devoluciones, soporte, garantías, notificaciones
            transaccionales, seguridad de la plataforma, prevención de fraude, gestión de carritos,
            atención a clientes, cumplimiento de obligaciones fiscales, contables, contractuales y
            legales, así como para operar, mantener, monitorear y mejorar los servicios de software,
            ecommerce e infraestructura tecnológica ofrecidos por Cloudi.
          </p>

          <h2>Finalidades secundarias</h2>

          <p>
            De forma adicional, podremos utilizar sus datos para enviar promociones, campañas,
            newsletters, recomendaciones de productos, encuestas, invitaciones, comunicaciones
            comerciales, análisis de comportamiento, medición de campañas, segmentación, remarketing,
            estadísticas, mejora de experiencia de usuario y desarrollo de nuevas funcionalidades.
          </p>

          <p>
            Si no desea que sus datos sean tratados para finalidades secundarias, puede solicitarlo
            enviando un correo a <strong>{contactEmail}</strong>. La negativa para estas finalidades no
            afectará los servicios, compras o relaciones contractuales solicitadas.
          </p>

          <h2>Cookies y tecnologías similares</h2>

          <p>
            CloudiShop puede utilizar cookies, pixeles, almacenamiento local, etiquetas, identificadores
            de sesión y herramientas de analítica para recordar preferencias, mantener sesiones,
            medir tráfico, mejorar seguridad, analizar embudos de compra, identificar canales de venta,
            personalizar contenido y evaluar campañas publicitarias. El usuario puede bloquear o eliminar
            estas tecnologías desde la configuración de su navegador, aunque algunas funciones del sitio
            podrían verse limitadas.
          </p>

          <h2>Transferencias y encargados</h2>

          <p>
            Sus datos podrán compartirse con empresas de paquetería, pasarelas de pago, bancos,
            proveedores de facturación, servicios de correo electrónico, WhatsApp o mensajería,
            almacenamiento en nube, hosting, analítica, seguridad, soporte técnico, consultores,
            autoridades competentes y terceros necesarios para cumplir las finalidades descritas.
            También podremos transferir datos cuando exista obligación legal, requerimiento de autoridad,
            cumplimiento contractual o protección de derechos de Cloudi, sus clientes o usuarios.
          </p>

          <h2>Medidas de seguridad</h2>

          <p>
            Implementamos medidas administrativas, técnicas y físicas razonables para proteger los datos
            personales contra daño, pérdida, alteración, destrucción, uso, acceso o tratamiento no
            autorizado. Estas medidas incluyen controles de acceso, autenticación, monitoreo, respaldos,
            cifrado cuando resulte aplicable, separación de ambientes, políticas internas y revisión de
            proveedores tecnológicos.
          </p>

          <h2>Derechos ARCO y revocación del consentimiento</h2>

          <p>
            Usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición, así como
            revocar su consentimiento o limitar el uso y divulgación de sus datos personales, enviando
            una solicitud a <strong>{contactEmail}</strong>. La solicitud deberá incluir nombre del titular,
            medio de contacto, descripción clara del derecho que desea ejercer, documentos que acrediten
            identidad o representación legal y cualquier elemento que facilite la localización de sus datos.
          </p>

          <p>
            Atenderemos las solicitudes conforme a los plazos y requisitos establecidos por la legislación
            aplicable. Cuando la solicitud resulte improcedente por disposición legal, relación contractual,
            obligación fiscal, prevención de fraude, seguridad o conservación necesaria, se informará al
            titular la razón correspondiente.
          </p>

          <h2>Conservación de datos</h2>

          <p>
            Conservaremos los datos personales durante el tiempo necesario para cumplir las finalidades
            descritas, las obligaciones legales, fiscales, contables, contractuales, de seguridad,
            auditoría, soporte o defensa de derechos. Una vez concluido el periodo aplicable, los datos
            serán eliminados, bloqueados o anonimizados cuando sea procedente.
          </p>

          <h2>Menores de edad</h2>

          <p>
            Nuestros servicios están dirigidos principalmente a personas mayores de edad o empresas. No
            buscamos recabar datos de menores sin consentimiento de padres, madres o tutores. Si detectamos
            que se han proporcionado datos de un menor sin autorización, podremos eliminarlos o bloquearlos.
          </p>

          <h2>Cambios al Aviso de Privacidad</h2>

          <p>
            Cloudi podrá modificar este Aviso de Privacidad para atender cambios legales, operativos,
            tecnológicos, comerciales o de seguridad. Las actualizaciones estarán disponibles en este sitio
            web y surtirán efectos desde su publicación, salvo que legalmente se requiera otro mecanismo
            de comunicación.
          </p>

          <p>
            Fecha de última actualización: <strong>22 de junio de 2026</strong>.
          </p>
        </article>
      </div>
    </section>
  )
}

export default PrivacyPolicyPage
