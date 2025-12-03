# Cambios en Reno Sidebar (Manu)

## ✅ Funcionalidad Nueva (APLICAR)
1. **Help Modal integrado**: Abre modal en lugar de navegar a página
2. **Badge de notificaciones**: Muestra contador de mensajes no leídos
3. **Link en logo**: Logo ahora es clickeable y navega a home
4. **Notificaciones activas**: Cambia `comingSoon: true` a `comingSoon: false` para notificaciones

## ⚠️ Cambios de Estilos (REVISAR)
1. **Dark mode removido**: Elimina `dark:bg-[var(--prophero-gray-900)]` del sidebar mobile
2. **Hover dark mode**: Cambia `dark:hover:bg-[var(--prophero-gray-800)]` a `dark:hover:bg-[#1a1a1a]`

## 📝 Cambios Específicos:

### Imports nuevos:
```typescript
import { HelpModal } from "@/components/reno/help-modal";
import { extractNameFromEmail } from "@/lib/supabase/user-name-utils";
import { useHelpConversations } from "@/hooks/useHelpConversations";
```

### Estado nuevo:
```typescript
const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
const { unreadCount } = useHelpConversations();
const userName = supabaseUser?.email 
  ? extractNameFromEmail(supabaseUser.email) 
  : appUser?.email 
  ? extractNameFromEmail(appUser.email)
  : undefined;
```

### Logo clickeable:
- Antes: `<VistralLogo variant={null} className="h-8" />`
- Después: `<Link href="/reno/construction-manager"><VistralLogo /></Link>`

### Badge de notificaciones:
```typescript
{item.badge !== undefined && item.badge > 0 && (
  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[var(--prophero-blue-600)] text-xs font-semibold text-white">
    {item.badge}
  </span>
)}
```

### Help Modal al final:
```typescript
<HelpModal
  open={isHelpModalOpen}
  onOpenChange={setIsHelpModalOpen}
  userName={userName}
  userRole={role || undefined}
/>
```






