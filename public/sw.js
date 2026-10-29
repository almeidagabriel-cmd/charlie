// /public/sw.js

self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Grupo B&A Flow", message: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Nova Notificação";
  const options = {
    body: data.message || "Você tem uma nova atualização.",
    icon: "/icon.png", 
    badge: "/badge.png",
    tag: "checklist-notification", // Evita duplicados
    renotify: true,
    requireInteraction: true, // Mantém o balão visível até o usuário clicar
    data: { url: data.url || "/checklist" },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/checklist";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});