import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

/**
 * Brand mark — brick-rose M3 squircle, rupee glyph, community ring with a
 * gold "member" dot. Same artwork as the app icon (assets/brand).
 */
export function Logo({ size = 64 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Defs>
          <LinearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#B0555A" />
            <Stop offset="1" stopColor="#7A2E33" />
          </LinearGradient>
        </Defs>
        <Rect width="1024" height="1024" rx="236" fill="url(#lg)" />
        <Circle
          cx="512"
          cy="512"
          r="340"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.16"
          strokeWidth="34"
        />
        <Circle cx="512" cy="172" r="46" fill="#FFD37A" />
        <SvgText
          x="512"
          y="700"
          textAnchor="middle"
          fontFamily="sans-serif"
          fontWeight="bold"
          fontSize="520"
          fill="#FFFFFF"
        >
          ₹
        </SvgText>
      </Svg>
    </View>
  );
}
