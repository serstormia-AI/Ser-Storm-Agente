# Guía de Despliegue en Producción: SerStorm AG

Este documento detalla los pasos para poner en marcha el **Agente Conversacional y CRM de SerStorm** en tu VPS de **Hostinger con Coolify**, conectar WhatsApp en modo coexistencia (Baileys) y activar los flujos en **n8n**.

---

## 1. Paso 1: Configurar Base de Datos en Supabase

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ve a **SQL Editor** y pega el contenido completo de [`supabase/schema.sql`](file:///c:/Users/gkar2/Desktop/SERSTORM-AG/supabase/schema.sql).
3. Ejecuta el script. Esto creará:
   - Las tablas `agencies`, `agency_brains`, `serstorm_leads`, `serstorm_conversations`, `serstorm_messages`, `serstorm_followups`, `serstorm_ai_events`.
   - El seed inicial de SerStorm y el cerebro comercial turístico de Pablo Diz.
   - La función RPC `serstorm_lead_metrics`.
4. En **Project Settings -> API**, copia:
   - `Project URL` (`SUPABASE_URL`)
   - `anon public key` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role secret key` (`SUPABASE_SERVICE_ROLE_KEY`)

---

## 2. Paso 2: Despliegue en Coolify (Hostinger VPS)

### Opción A: Despliegue con Docker Compose en Coolify (Recomendado)

1. En tu panel de **Coolify**, ve a tu Proyecto y haz clic en **+ New Resource -> Docker Compose**.
2. Sube o vincula tu repositorio Git (`SERSTORM-AG`) o pega el contenido de [`docker-compose.yml`](file:///c:/Users/gkar2/Desktop/SERSTORM-AG/docker-compose.yml).
3. En la pestaña **Environment Variables**, configura las variables según `.env.example`:
   ```bash
   SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ANTHROPIC_API_KEY=sk-ant-api03-...
   OPENAI_API_KEY=sk-proj-...
   N8N_WEBHOOK_URL=https://n8n.tu-dominio.com/webhook/serstorm-events
   ```
4. Asigna un dominio para el panel (ej. `crm.serstorm.com` con SSL automático de Coolify / Traefik apuntando al puerto `3000`).
5. Haz clic en **Deploy**.

---

## 3. Paso 3: Vinculación de WhatsApp (Coexistencia con Baileys)

1. Una vez desplegado `serstorm-worker` en Coolify, ve a la pestaña **Logs** del contenedor `serstorm-worker`.
2. Verás en los registros el **código QR en formato ASCII**.
3. Abre WhatsApp en el celular comercial de SerStorm (o en la app oficial de WhatsApp Business):
   - Ve a **Dispositivos Vinculados** -> **Vincular Dispositivo**.
   - Apunta la cámara a la pantalla para escanear el QR.
4. En los logs aparecerá:
   ```
   ✅ [Baileys] ¡Conexión exitosa a WhatsApp! Modo Coexistencia Activo.
   ```
5. **Persistencia**: La sesión queda guardada de forma segura en el volumen Docker `serstorm_auth_data`. Si el contenedor se reinicia o actualiza, reconecta automáticamente sin volver a pedir QR.

### Cómo funciona la Coexistencia:
- El equipo de SerStorm puede seguir usando WhatsApp en sus celulares o WhatsApp Web normalmente.
- Cuando un asesor responde directamente desde el celular o desde el Panel CRM, el sistema detecta la intervención y **apaga la IA para esa conversación (`ai_enabled = false`)** para no interferir con la venta humana.
- En cualquier momento el asesor puede volver a activar la IA con el botón **Reactivar IA** desde el panel.

---

## 4. Paso 4: Importar Flujo de Automatización en n8n

1. Abre tu instancia de **n8n** en Coolify.
2. Ve a **Workflows -> Import from File** y selecciona [`workflows/n8n-serstorm-alerts.json`](file:///c:/Users/gkar2/Desktop/SERSTORM-AG/workflows/n8n-serstorm-alerts.json).
3. El workflow incluye:
   - **Webhook**: Recibe eventos del worker (`/webhook/serstorm-events`).
   - **Switch**: Discrimina entre:
     - `lead_qualified`: Notifica nuevo lead calificado para SerStorm (hotel, presupuesto de pauta, necesidades).
     - `audit_booked`: Alerta de auditoría confirmada para la agenda de Pablo Diz.
     - `human_handoff`: Alerta de prospecto que pide hablar con una persona.
4. Conecta las salidas a tu nodo de **Telegram**, **Slack** o **WhatsApp** para que el equipo reciba las alertas en tiempo real.
5. Activa el workflow (**Active = true**).

---

## 5. Paso 5: Personalización del Cerebro desde el Panel Web

No es necesario editar archivos de código para cambiar la estrategia comercial:
1. Ingresa a `https://crm.tu-dominio.com/brain`.
2. Podrás modificar:
   - La propuesta de valor de SerStorm y experiencia de Pablo Diz.
   - Los servicios ofrecidos (pauta, SEO, web, bots).
   - Tono y estilo de conversación.
   - Reglas de calificación y derivación.
3. Al hacer clic en **Guardar Cambios del Cerebro**, el agente IA asimila las nuevas instrucciones en su siguiente turno.
