import React from "react";
import Image from "next/image";

interface TechStackItemProps {
  name: string;
  icon: string;
}

const TechStackItem: React.FC<TechStackItemProps> = ({ name, icon }) => {
  return (
    <div className="group flex-shrink-0 mx-8 flex flex-col items-center justify-center p-4">
      <Image
        src={icon}
        alt={name}
        width={48}
        height={48}
        className="h-12 w-12 object-contain transition-all duration-300 grayscale group-hover:grayscale-0 group-hover:scale-110 drop-shadow-neon-teal group-hover:drop-shadow-neon-teal-lg"
      />
      <p className="mt-4 text-center text-[#64748b] font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {name}
      </p>
    </div>
  );
};

export default TechStackItem;
