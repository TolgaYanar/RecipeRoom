export default function LoadingSpinner({ size = 'md' }) {
  const dim = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-4', lg: 'h-12 w-12 border-4' }[size];
  return (
    <div className="flex justify-center items-center p-8">
      <div className={`${dim} border-gray-200 border-t-[#1B3A2D] rounded-full animate-spin`} />
    </div>
  );
}
