'use client';
import { CgPluginLib, CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const publicKey = process.env.NEXT_PUBLIC_PUBKEY as string;
if (!publicKey) {
  throw new Error("Public key is not set in the .env file, please set it and try again.");
}

const MyInfo = () => {
  const [userInfo, setUserInfo] = useState<UserInfoResponsePayload | null>(null);
  const [communityInfo, setCommunityInfo] = useState<CommunityInfoResponsePayload | null>(null);
  const [friends, setFriends] = useState<UserFriendsResponsePayload | null>(null);
  const searchParams = useSearchParams();
  const iframeUid = searchParams.get('iframeUid');

  const fetchUserInfo = useCallback(async () => {
    const cgPluginLibInstance = CgPluginLib.getInstance();
    const userInfo = await cgPluginLibInstance.getUserInfo();
    setUserInfo(userInfo.data);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const cgPluginLibInstance = await CgPluginLib.initialize(iframeUid || '', '/api/sign', publicKey);

      await fetchUserInfo();

      cgPluginLibInstance.getCommunityInfo().then((communityInfo) => {
        console.log('communityInfo', communityInfo);
        setCommunityInfo(communityInfo.data);
      });

      cgPluginLibInstance.getUserFriends(10, 0).then((friends) => {
        console.log('friends', friends);
        setFriends(friends.data);
      });
    }

    fetchData();
  }, [iframeUid, fetchUserInfo]);

  const assignableRoles = useMemo(() => {
    return communityInfo?.roles.filter((role) => role.assignmentRules?.type === 'free' || role.assignmentRules === null);
  }, [communityInfo]);

  return (<div className='flex flex-col gap-6'>
    <div className='flex flex-col gap-2 p-2 border border-gray-300 rounded-md'>
      <p className='font-bold'>Your username is: {userInfo?.name}</p>
      {!!userInfo?.twitter && <p className='font-bold'>Your twitter account is: {userInfo?.twitter?.username || 'Not connected'}</p>}
      {!!userInfo?.lukso && <p className='font-bold'>Your lukso account is: {userInfo?.lukso?.username || 'Not connected'}</p>}
      {!!userInfo?.farcaster && <p className='font-bold'>Your farcaster account is: {userInfo?.farcaster?.username || 'Not connected'}</p>}
      {!!userInfo?.email && <p className='font-bold'>Your email is: {userInfo?.email || 'Not connected'}</p>}
      <p className='font-bold'>Your community is: {communityInfo?.title}</p>
    </div>

    {friends && friends.friends.length > 0 && <div className='flex flex-col gap-2 p-2 border border-gray-300 rounded-md'>
      <p className='font-bold'>Some of your friends:</p>
      {friends.friends.map((friend) => (<div key={friend.id} className='flex items-center gap-2'>
        <Image src={friend.imageUrl} alt={friend.name} width={40} height={40} className='rounded-full' />
        <span>{friend.name}</span>
      </div>))}
    </div>}

    {assignableRoles && assignableRoles.length > 0 && <div className='flex flex-col gap-2 p-2 border border-gray-300 rounded-md'>
      <p className='font-bold'>Assignable roles</p>
      {assignableRoles?.map((role) => (
        <div className='grid grid-cols-2 items-center gap-2' key={role.id}>
          <p>{role.title}</p>
          {userInfo?.roles.includes(role.id) ? <span>Has Role</span> : <button className='bg-blue-500 text-white px-2 py-1 rounded-md' onClick={async () => {
            await CgPluginLib.getInstance().giveRole(role.id, userInfo?.id || '');
            await fetchUserInfo();
          }}>Give role</button>}
        </div>
      ))}
    </div>}
  </div>);
}

export default MyInfo;