import React, {useCallback} from 'react'
import {ListRenderItemInfo, View} from 'react-native'
import {AppBskyActorDefs, AtUri} from '@atproto/api'

import {useBottomBarOffset} from 'lib/hooks/useBottomBarOffset'
import {isNative} from 'platform/detection'
import {useListMembersQuery} from 'state/queries/list-members'
import {useSession} from 'state/session'
import {ProfileCardWithFollowBtn} from 'view/com/profile/ProfileCard'
import {List, ListRef} from 'view/com/util/List'
import {SectionRef} from '#/screens/Profile/Sections/types'

function renderItem({
  item,
  index,
}: ListRenderItemInfo<AppBskyActorDefs.ProfileViewBasic>) {
  return (
    <ProfileCardWithFollowBtn
      profile={item}
      logContext="StarterPackProfilesList"
      noBorder={isNative && index === 0}
    />
  )
}

function keyExtractor(item: AppBskyActorDefs.ProfileViewBasic, index: number) {
  return `${item.did}-${index}`
}

interface ProfilesListProps {
  listUri: string
  headerHeight: number
  scrollElRef: ListRef
}

export const ProfilesList = React.forwardRef<SectionRef, ProfilesListProps>(
  function ProfilesListImpl({listUri, headerHeight, scrollElRef}, ref) {
    const [initialHeaderHeight] = React.useState(headerHeight)
    const bottomBarOffset = useBottomBarOffset(20)
    const {currentAccount} = useSession()

    const [isPTRing, setIsPTRing] = React.useState(false)
    const {data, refetch} = useListMembersQuery(listUri, 50)

    // The server returns these sorted by descending creation date, so we want to invert
    const profiles = data?.pages
      .flatMap(p => p.items.map(i => i.subject))
      .reverse()
    const isOwn = new AtUri(listUri).host === currentAccount?.did

    const getSortedProfiles = () => {
      if (!profiles) return
      if (!isOwn) return profiles

      const myIndex = profiles.findIndex(p => p.did === currentAccount?.did)
      return myIndex !== -1
        ? [
            profiles[myIndex],
            ...profiles.slice(0, myIndex),
            ...profiles.slice(myIndex + 1),
          ]
        : profiles
    }
    const onScrollToTop = useCallback(() => {
      scrollElRef.current?.scrollToOffset({
        animated: isNative,
        offset: -headerHeight,
      })
    }, [scrollElRef, headerHeight])

    React.useImperativeHandle(ref, () => ({
      scrollToTop: onScrollToTop,
    }))

    return (
      <List
        data={getSortedProfiles()}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ref={scrollElRef}
        headerOffset={headerHeight}
        ListFooterComponent={
          <View style={[{height: initialHeaderHeight + bottomBarOffset}]} />
        }
        showsVerticalScrollIndicator={false}
        desktopFixedHeight
        refreshing={isPTRing}
        onRefresh={async () => {
          setIsPTRing(true)
          await refetch()
          setIsPTRing(false)
        }}
      />
    )
  },
)