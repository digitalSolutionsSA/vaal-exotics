import { formatZAR } from "../lib/money";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../context/cart";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function OrderSuccess() {
  const cart = useCart();
  const q = useQuery();

  // create-checkout.ts currently sends order_id, not orderId
  const orderId = q.get("order_id") || q.get("orderId") || "";

  const raw =
    sessionStorage.getItem("pendingOrder") ||
    sessionStorage.getItem("lastOrder");

  const [order] = useState<any>(() => (raw ? JSON.parse(raw) : null));
  const [notifyState, setNotifyState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  const notificationStartedRef = useRef(false);

  useEffect(() => {
    try {
      const clearedKey = `order_cleared_${orderId || "noid"}`;
      if (sessionStorage.getItem(clearedKey)) return;
      cart.clear();
      sessionStorage.setItem(clearedKey, "1");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;

    async function sendOwnerNotification() {
      if (!orderId || !order) return;

      const sentKey = `owner_notified_${orderId}`;

      if (sessionStorage.getItem(sentKey)) {
        if (!cancelled) setNotifyState("sent");
        return;
      }

      if (notificationStartedRef.current) {
        return;
      }

      notificationStartedRef.current = true;

      try {
        if (!cancelled) setNotifyState("sending");

        console.log("[OrderSuccess] sendOwnerNotification start", {
          orderId,
          order,
        });

        const res = await fetch("/.netlify/functions/send-order-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            order,
          }),
        });

        const text = await res.text();
        let json: any = null;

        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = null;
        }

        console.log("[OrderSuccess] notification response:", {
          status: res.status,
          ok: res.ok,
          json,
          rawText: text,
        });

        if (!res.ok) {
          throw new Error(
            json?.error || text || "Failed to send owner notification"
          );
        }

        if (!cancelled) {
          sessionStorage.setItem(sentKey, "1");

          if (json?.ok || json?.alreadySent) {
            setNotifyState("sent");
          } else {
            setNotifyState("error");
          }
        }
      } catch (err) {
        console.error("Owner notification failed:", err);

        notificationStartedRef.current = false;

        if (!cancelled) setNotifyState("error");
      }
    }

    sendOwnerNotification();

    return () => {
      cancelled = true;
    };
  }, [orderId, order]);

  useEffect(() => {
    if (notifyState !== "sending") return;

    const timeoutId = window.setTimeout(() => {
      setNotifyState((prev) => (prev === "sending" ? "error" : prev));
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [notifyState]);

  if (!order) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-10">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold">No order details found</h1>
          <p className="mt-2 text-white/70">
            We couldn’t load the order summary from this device/session. If you
            just paid, your payment reference should still be recorded on the
            merchant side.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link
              to="/shop"
              className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black"
            >
              Back to shop
            </Link>
            <Link
              to="/checkout"
              className="inline-flex rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90"
            >
              Back to checkout
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const ownerMessage = [
    `✅ ORDER COMPLETED${orderId ? `: ${orderId}` : ""}`,
    order?.createdAt ? `Created: ${order.createdAt}` : "",
    ``,
    `Amount: ${formatZAR(order.totals.grandTotal)}`,
    `Courier: ${formatZAR(order.totals.courierFee)} (Total kg: ${order.totals.totalKg.toFixed(1)}kg)`,
    ``,
    `Customer: ${order.customer.firstName} ${order.customer.lastName}`,
    `Email: ${order.customer.email}`,
    `Phone: ${order.customer.phone}`,
    ``,
    `Address:`,
    `${order.address.line1}`,
    order.address.line2 ? `${order.address.line2}` : "",
    `${order.address.suburb}, ${order.address.city}`,
    `${order.address.province}, ${order.address.postalCode}`,
    ``,
    `Items:`,
    ...order.items.map(
      (it: any) => `- ${it.qty}x ${it.name} @ ${formatZAR(it.price)} each`
    ),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-10">
          <h1 className="text-3xl font-semibold">Payment completed</h1>
          <p className="mt-2 text-white/70">
            Thanks! Your checkout was completed. The owner notification is being
            submitted automatically from the backend.
          </p>

          {orderId ? (
            <p className="mt-2 text-sm text-white/60">
              Reference:{" "}
              <span className="font-semibold text-white">{orderId}</span>
            </p>
          ) : null}

          <div className="mt-3 text-sm">
            {notifyState === "sending" ? (
              <p className="text-yellow-300">
                Submitting owner WhatsApp notification...
              </p>
            ) : null}

            {notifyState === "sent" ? (
              <p className="text-green-400">
                Owner WhatsApp notification accepted.
              </p>
            ) : null}

            {notifyState === "error" ? (
              <p className="text-red-400">
                Payment page loaded, but the owner notification could not be
                confirmed automatically.
              </p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <h2 className="text-lg font-semibold">Order summary</h2>
              <div className="mt-3 text-sm text-white/80 space-y-2">
                <div className="flex justify-between">
                  <span>Items total</span>
                  <span>{formatZAR(order.totals.itemsTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Courier</span>
                  <span>{formatZAR(order.totals.courierFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total kg</span>
                  <span>{order.totals.totalKg.toFixed(1)}kg</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-white/10">
                  <span>Grand total</span>
                  <span className="text-lg font-semibold">
                    {formatZAR(order.totals.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <h2 className="text-lg font-semibold">Owner notification preview</h2>
              <p className="mt-2 text-xs text-white/60">
                This is the message submitted to WhatsApp from the backend after
                checkout success.
              </p>
              <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
                {ownerMessage}
              </pre>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/shop"
              className="inline-flex justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              Shop again
            </Link>
            <Link
              to="/"
              className="inline-flex justify-center rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              Back home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}