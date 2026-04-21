import Image from "next/image";

const CountDashboard = ({ count }) => {
  const { name, data, image, symbol } = count;

  return (
    <div
      className="
        group relative overflow-hidden
        rounded-[24px]
        border border-violet-100
        bg-white dark:bg-darkdeep1
        p-5 md:p-6
        min-h-[160px]
        shadow-sm
        transition-all duration-300
        hover:shadow-lg hover:-translate-y-[2px]
      "
    >
      {/* diagonal premium background */}
      <div
        className="
          absolute inset-0
          bg-gradient-to-br
         from-[#1E0F5A] via-[#2a1575] to-[#493c6d]
          [clip-path:polygon(0_100%,0_45%,100%_100%)]
          opacity-90
        "
      />

      {/* content */}
      <div className="relative z-10 flex h-full flex-col justify-between">
        {/* top section */}
        <div className="flex items-start justify-between">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            {name}
          </p>

          <div
            className="
              flex h-12 w-12 items-center justify-center
              rounded-xl
              bg-violet-50
              border border-violet-100
            "
          >
            <Image
              src={image}
              alt={name}
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
        </div>

        {/* bottom metric */}
        <div className="relative z-10">
          <h3 className="text-4xl font-bold leading-none text-white">
            <span data-countup-number={data}>{data}</span>
            {symbol && <span className="ml-1">{symbol}</span>}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default CountDashboard;