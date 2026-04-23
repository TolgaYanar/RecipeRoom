export default function EmptyState({ message = 'Nothing here yet.', icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <p className="text-lg">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
