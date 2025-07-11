import React from 'react';
import Image from 'next/image';

interface IconProps {
  name: 'camera' | 'laptop' | 'briefcase' | 'twitter';
  size?: number;
  className?: string;
}

const iconMap = {
  camera: 'https://img.icons8.com/?id=7oEDRZeazDGp&format=png&size=24',
  laptop: 'https://img.icons8.com/?id=ep6LZbDHV-NZ&format=png&size=24',
  briefcase: 'https://img.icons8.com/?id=482&format=png&size=24',
  twitter: 'https://img.icons8.com/?id=437&format=png&size=24',
};

const Icon: React.FC<IconProps> = ({ name, size = 24, className = '' }) => {
  return (
    <Image
      src={iconMap[name]}
      alt={name}
      width={size}
      height={size}
      className={className}
    />
  );
};

export default Icon;