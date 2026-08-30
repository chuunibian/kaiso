import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="dark"
            position="bottom-right"
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-100 group-[.toaster]:border-red-500/40 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl font-sans p-4",
                    description: "group-[.toast]:text-zinc-300 text-xs mt-1",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                },
            }}
            {...props}
        />
    );
};

export default Toaster;
