import { LuChefHat, LuPlus, LuTrash2, LuUpload } from "react-icons/lu";

export default function CreateRecipe() {
    return (
        <div className="max-w-screen mx-auto px-4 py-10 bg-yellow-200">
                {/* Header */}
                <div className="bg-green-950 text-white p-6 rounded-t-xl flex items-center gap-4 shadow-md">
                    <div className="bg-amber-400 text-green-950 p-3 rounded-full">
                        <LuChefHat className="text-3xl" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Create New Recipe</h1>
                        <p className="text-gray-300 mt-1 text-sm">
                            Share your culinary creation with the Recipe Room community
                        </p>
                    </div>
                </div>
            

                {/* Grid starting point */}
                <div className="grid lg:grid-cols-3 gap-6 mt-6">
                    <div className="col-span-2">FORM CARD </div>
                    <div className="col-span-1">details card</div>
                </div>
            
        </div>
    );
}
