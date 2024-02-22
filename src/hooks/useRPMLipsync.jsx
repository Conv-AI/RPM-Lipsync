import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { lerpMorphTarget } from '../helpers/lerpMorphTarget';
import * as THREE from 'three';
import _ from 'lodash';

// Ready Player Me lipsync code
const RPMViseme = {
  0: 'viseme_sil',
  1: 'viseme_PP',
  2: 'viseme_FF',
  3: 'viseme_TH',
  4: 'viseme_DD',
  5: 'viseme_KK',
  6: 'viseme_CH',
  7: 'viseme_SS',
  8: 'viseme_NN',
  9: 'viseme_RR',
  10: 'viseme_AA',
  11: 'viseme_E',
  12: 'viseme_I',
  13: 'viseme_O',
  14: 'viseme_U',
};
export const useRPMLipsync = ({ client, nodes, scene }) => {
  const [tick, setTick] = useState(true);
  const blendShapeRef = useRef([]);
  const currentBlendFrame = useRef(0);

  // resetting blendShapeRef and currentFrameIndex facial data
  useEffect(() => {
    if (client?.facialData.length === 0) {
      blendShapeRef.current = [];
      currentBlendFrame.current = 0;
    }
  }, [client?.facialData]);

  const [blink, setBlink] = useState(false);
  // Create a throttled function that updates the animation
  const throttledUpdate = _.throttle(updateAnimation, 10); // 16ms is roughly 60 frames per second
  function updateAnimation() {
    setTick((tick) => {
      if (tick) {
        return tick;
      }
      return true;
    });
    requestAnimationFrame(throttledUpdate);
  }

  useEffect(() => {
    // Start the animation loop when the component mounts
    requestAnimationFrame(throttledUpdate);
    // Clean up the animation loop when the component unmounts
    return () => {
      cancelAnimationFrame(throttledUpdate);
    };
  }, []);
  //  animation loop
  const [startClock, setStartClock] = useState(false);

  useFrame((state, _delta) => {
    if (tick) {
      /**
       * Sync code ends
       */
      if (!startClock || !client?.isTalking) {
        state.clock.elapsedTime = 0;
        if (startClock) setStartClock(false);
      }

      if (client?.isTalking) {
        setStartClock(true);
      }
      if (startClock) {
        const frameSkipNumber = 5;
        if (
          Math.floor(state.clock.elapsedTime * 100) -
            currentBlendFrame.current >
          frameSkipNumber
        ) {
          for (let i = 0; i < frameSkipNumber; i++) {
            blendShapeRef.current.push(0);
          }
          currentBlendFrame.current += frameSkipNumber;
          // console.log('Low fps');
        } else if (
          Math.floor(state.clock.elapsedTime * 100) -
            currentBlendFrame.current <
          -frameSkipNumber
        ) {
          blendShapeRef.current.splice(-frameSkipNumber);
          currentBlendFrame.current -= frameSkipNumber + 1;
          // console.log('high fps');
        }
      }
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        if (key === 'eyeBlinkLeft' || key === 'eyeBlinkRight') {
          return;
        }
      });
      lerpMorphTarget('eyeBlinkLeft', blink ? 1 : 0, 0.5, scene);
      lerpMorphTarget('eyeBlinkRight', blink ? 1 : 0, 0.5, scene);

      // run all blends here
      if (currentBlendFrame.current <= client?.facialData.length) {
        // console.log("---------------",currentBlendFrame.current,"------------------")
        for (const blend in client?.facialData[currentBlendFrame.current - 1]) {
          lerpMorphTarget(
            RPMViseme[blend],
            client.facialData[currentBlendFrame.current - 1][blend],
            1,
            scene
          );
        }
        currentBlendFrame.current += 1;
      }

      setTick(false);
    }
  });
  // Reset code
  useEffect(() => {
    if (!client?.isTalking) {
      // reset all blendshapes
      scene.traverse((child) => {
        if (child.isSkinnedMesh && child.morphTargetDictionary) {
          for (const target in child.morphTargetDictionary) {
            const index = child.morphTargetDictionary[target];
            if (
              index === undefined ||
              child.morphTargetInfluences[index] === undefined
            ) {
              return;
            }

            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              0,
              1
            );
          }
        }
      });
    }
  }, [client?.isTalking, scene]);
  // blink
  useEffect(() => {
    let blinkTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, [200]);
      }, THREE.MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);
};
