// /public/sw.js

self.addEventListener("push", function (event) {
  if (!(self.Notification && self.Notification.permission === "granted")) {
    return;
  }

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Nova notificação", message: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Grupo B&A Flow";
  const options = {
    body: data.message || "Você tem uma nova atualização.",
    icon: "/icon.png", // Se tiver um ícone na pasta public, pode usar aqui
    badge: "/badge.png",
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
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});